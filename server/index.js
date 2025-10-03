import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { query, initializeDatabase } from './db.js';
import { requireAuth, getUserFromSession } from './middleware/auth.js';

const app = express();
const PORT = 3000;

let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  sessionSecret = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️  WARNING: SESSION_SECRET not set in environment variables!');
  console.warn('⚠️  Using randomly generated secret. Sessions will be invalidated on server restart.');
  console.warn('⚠️  Please set SESSION_SECRET environment variable in production!');
}

const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',') 
  : ['http://localhost:5000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return email && typeof email === 'string' && email.length <= 254 && emailRegex.test(email);
}

function isValidPassword(password) {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 8 || password.length > 128) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false;
  return true;
}

function sanitizeHtml(input) {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .substring(0, 1000);
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MotiveMe API is running' });
});

app.post('/api/auth/signup', authLimiter, async (req, res) => {
  try {
    const { email, password, metadata = {} } = req.body;

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Format email invalide (ex: nom@domaine.com)' });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({ 
        error: 'Le mot de passe doit contenir au moins 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial'
      });
    }

    const sanitizedName = sanitizeHtml(metadata.name || email.split('@')[0]);
    
    const existingAuth = await query(
      'SELECT * FROM auth_credentials WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (existingAuth.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = await query(
      `INSERT INTO users (email, name, points, badges, preferences, stats)
       VALUES ($1, $2, 0, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb)
       RETURNING *`,
      [email.toLowerCase().trim(), sanitizedName]
    );

    const user = userResult.rows[0];

    await query(
      `INSERT INTO auth_credentials (user_id, email, password_hash, email_verified) 
       VALUES ($1, $2, $3, false)`,
      [user.id, email.toLowerCase().trim(), passwordHash]
    );

    req.session.userId = user.id;
    req.session.userEmail = user.email;

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          points: user.points,
          badges: user.badges,
          preferences: user.preferences,
          stats: user.stats,
          user_metadata: metadata
        },
        session: {
          access_token: 'session-based-auth',
          user: {
            id: user.id,
            email: user.email,
            name: user.name
          }
        }
      },
      message: `Bienvenue ${sanitizedName} ! Ton compte a été créé avec succès.`
    });
  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/signin', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Format email invalide' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Mot de passe requis' });
    }

    const authResult = await query(
      'SELECT * FROM auth_credentials WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (authResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const authCredentials = authResult.rows[0];
    const isValidPassword = await bcrypt.compare(password, authCredentials.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userResult = await query(
      'SELECT * FROM users WHERE id = $1',
      [authCredentials.user_id]
    );

    const user = userResult.rows[0];

    req.session.userId = user.id;
    req.session.userEmail = user.email;

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          points: user.points,
          badges: user.badges,
          preferences: user.preferences,
          stats: user.stats
        },
        session: {
          access_token: 'session-based-auth',
          user: {
            id: user.id,
            email: user.email,
            name: user.name
          }
        }
      },
      message: `Bienvenue ${user.name} !`
    });
  } catch (error) {
    console.error('❌ Sign in error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/signout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Failed to sign out' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Signed out successfully' });
  });
});

app.get('/api/auth/session', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.json({ success: true, session: null, user: null });
    }
    
    const userResult = await query(
      'SELECT * FROM users WHERE id = $1',
      [req.session.userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.json({ success: true, session: null, user: null });
    }
    
    const user = userResult.rows[0];
    
    res.json({
      success: true,
      data: {
        session: {
          access_token: 'session-based-auth',
          user: user
        },
        user: user
      }
    });
  } catch (error) {
    console.error('❌ Session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/users/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    
    if (req.session.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/challenges', requireAuth, async (req, res) => {
  try {
    const {
      user_id,
      title,
      duration,
      frequency,
      custom_days,
      witness_email,
      gage,
      start_date,
      end_date,
      occurrences,
      timezone,
      reminder_time,
      metadata
    } = req.body;

    if (req.session.userId !== user_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const sanitizedTitle = sanitizeHtml(title);
    const sanitizedGage = sanitizeHtml(gage);

    const result = await query(
      `INSERT INTO challenges (
        user_id, title, duration, frequency, custom_days, witness_email, gage,
        status, start_date, end_date, occurrences, timezone, reminder_time,
        completion_rate, current_streak, points_earned, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9, $10, $11, $12, 0, 0, 0, $13)
      RETURNING *`,
      [
        user_id, sanitizedTitle, duration, frequency,
        JSON.stringify(custom_days || []),
        witness_email,
        sanitizedGage,
        start_date,
        end_date,
        JSON.stringify(occurrences || []),
        timezone,
        reminder_time,
        JSON.stringify(metadata || {})
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('❌ Create challenge error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/challenges/user/:userId', requireAuth, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (req.session.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const result = await query(
      'SELECT * FROM challenges WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Get challenges error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/challenges/:id', requireAuth, async (req, res) => {
  try {
    const challengeId = req.params.id;
    const updates = req.body;
    
    const challengeResult = await query(
      'SELECT user_id FROM challenges WHERE id = $1',
      [challengeId]
    );
    
    if (challengeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    
    if (challengeResult.rows[0].user_id !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    if (updates.title !== undefined) {
      fields.push(`title = $${paramCount++}`);
      values.push(sanitizeHtml(updates.title));
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }
    if (updates.occurrences !== undefined) {
      fields.push(`occurrences = $${paramCount++}`);
      values.push(JSON.stringify(updates.occurrences));
    }
    if (updates.completion_rate !== undefined) {
      fields.push(`completion_rate = $${paramCount++}`);
      values.push(updates.completion_rate);
    }
    if (updates.current_streak !== undefined) {
      fields.push(`current_streak = $${paramCount++}`);
      values.push(updates.current_streak);
    }
    if (updates.points_earned !== undefined) {
      fields.push(`points_earned = $${paramCount++}`);
      values.push(updates.points_earned);
    }
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    fields.push(`updated_at = NOW()`);
    values.push(challengeId);
    
    const updateQuery = `
      UPDATE challenges 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await query(updateQuery, values);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('❌ Update challenge error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/notifications', requireAuth, async (req, res) => {
  try {
    const { user_id, type, title, message, metadata } = req.body;
    
    if (req.session.userId !== user_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const sanitizedTitle = sanitizeHtml(title);
    const sanitizedMessage = sanitizeHtml(message);
    
    const result = await query(
      `INSERT INTO notifications (user_id, type, title, message, read, metadata)
       VALUES ($1, $2, $3, $4, false, $5)
       RETURNING *`,
      [user_id, type, sanitizedTitle, sanitizedMessage, JSON.stringify(metadata || {})]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('❌ Create notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/notifications/user/:userId', requireAuth, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (req.session.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const result = await query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Get notifications error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const startServer = async () => {
  try {
    console.log('🔧 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized successfully');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 MotiveMe API server running on http://0.0.0.0:${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔒 Session secret: ${sessionSecret.substring(0, 10)}...`);
      console.log(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
