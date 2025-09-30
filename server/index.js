import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { query, initializeAuthTable } from './db.js';
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MotiveMe API is running' });
});

app.post('/api/auth/signup', authLimiter, async (req, res) => {
  try {
    const { email, password, metadata = {} } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        error: 'Password must contain at least 8 characters, 1 uppercase letter, 1 lowercase letter, and 1 number' 
      });
    }

    const existingAuth = await query(
      'SELECT * FROM auth_credentials WHERE email = $1',
      [email]
    );

    if (existingAuth.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = await query(
      `INSERT INTO users (email, name, points, badges, preferences, stats)
       VALUES ($1, $2, 0, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb)
       RETURNING *`,
      [email, metadata.name || email.split('@')[0]]
    );

    const user = userResult.rows[0];

    await query(
      'INSERT INTO auth_credentials (user_id, email, password_hash) VALUES ($1, $2, $3)',
      [user.id, email, passwordHash]
    );

    req.session.userId = user.id;
    req.session.userEmail = user.email;

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        user_metadata: metadata
      },
      session: {
        access_token: 'session-based-auth',
        user: {
          id: user.id,
          email: user.email
        }
      }
    });
  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/signin', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const authResult = await query(
      'SELECT * FROM auth_credentials WHERE email = $1',
      [email]
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
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      session: {
        access_token: 'session-based-auth',
        user: {
          id: user.id,
          email: user.email
        }
      }
    });
  } catch (error) {
    console.error('❌ Signin error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/signout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Signout error:', err);
      return res.status(500).json({ error: 'Failed to sign out' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Signed out successfully' });
  });
});

app.get('/api/auth/session', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.json({ session: null, user: null });
  }

  res.json({
    session: {
      access_token: 'session-based-auth',
      user: {
        id: req.session.userId,
        email: req.session.userEmail
      }
    },
    user: {
      id: req.session.userId,
      email: req.session.userEmail
    }
  });
});

app.get('/api/users/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.params.id;

    if (req.session.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/users/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.params.id;

    if (req.session.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updates = req.body;

    if (updates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    if (updates.phone) {
      const phoneRegex = /^\+?[\d\s\-()]{8,}$/;
      if (!phoneRegex.test(updates.phone)) {
        return res.status(400).json({ error: 'Invalid phone number format' });
      }
    }

    const allowedFields = ['name', 'first_name', 'last_name', 'phone', 'points', 'badges', 'preferences', 'stats'];
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = $${paramIndex}`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(userId);
    const updateQuery = `
      UPDATE users 
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('❌ Update user error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/challenges', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const result = await query(
      'SELECT * FROM challenges WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({ data: result.rows });
  } catch (error) {
    console.error('❌ Get challenges error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/challenges', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const {
      title,
      duration,
      frequency,
      custom_days,
      witness_email,
      gage,
      status,
      start_date,
      end_date,
      timezone,
      reminder_time
    } = req.body;

    if (!title || !duration || !witness_email || !gage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await query(
      `INSERT INTO challenges (
        user_id, title, duration, frequency, custom_days, witness_email, gage,
        status, start_date, end_date, timezone, reminder_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        userId,
        title,
        duration,
        frequency || 'daily',
        custom_days,
        witness_email,
        gage,
        status || 'active',
        start_date || new Date(),
        end_date,
        timezone || 'Europe/Paris',
        reminder_time || '09:00:00'
      ]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('❌ Create challenge error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/challenges/:id', requireAuth, async (req, res) => {
  try {
    const challengeId = req.params.id;
    const userId = req.session.userId;

    const ownerCheck = await query(
      'SELECT user_id FROM challenges WHERE id = $1',
      [challengeId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    if (ownerCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updates = req.body;
    const allowedFields = [
      'title', 'duration', 'frequency', 'custom_days', 'witness_email', 'gage',
      'status', 'end_date', 'occurrences', 'timezone', 'reminder_time',
      'completion_rate', 'current_streak', 'points_earned', 'metadata'
    ];
    
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = $${paramIndex}`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(challengeId);
    const updateQuery = `
      UPDATE challenges 
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('❌ Update challenge error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/challenges/:id', requireAuth, async (req, res) => {
  try {
    const challengeId = req.params.id;
    const userId = req.session.userId;

    const ownerCheck = await query(
      'SELECT user_id FROM challenges WHERE id = $1',
      [challengeId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    if (ownerCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await query('DELETE FROM challenges WHERE id = $1', [challengeId]);

    res.json({ message: 'Challenge deleted successfully' });
  } catch (error) {
    console.error('❌ Delete challenge error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/check-ins', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { challenge_id } = req.query;

    let queryText = 'SELECT * FROM check_ins WHERE user_id = $1';
    const params = [userId];

    if (challenge_id) {
      queryText += ' AND challenge_id = $2';
      params.push(challenge_id);
    }

    queryText += ' ORDER BY checked_at DESC';

    const result = await query(queryText, params);

    res.json({ data: result.rows });
  } catch (error) {
    console.error('❌ Get check-ins error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/check-ins', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { challenge_id, occurrence_id, notes, proof_url } = req.body;

    if (!challenge_id || occurrence_id === undefined) {
      return res.status(400).json({ error: 'challenge_id and occurrence_id are required' });
    }

    const challengeCheck = await query(
      'SELECT user_id FROM challenges WHERE id = $1',
      [challenge_id]
    );

    if (challengeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    if (challengeCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await query(
      `INSERT INTO check_ins (user_id, challenge_id, occurrence_id, notes, proof_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, challenge_id, occurrence_id, notes, proof_url]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('❌ Create check-in error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notifications', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const limit = parseInt(req.query.limit) || 50;

    const result = await query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );

    res.json({ data: result.rows });
  } catch (error) {
    console.error('❌ Get notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/notifications/:id', requireAuth, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.session.userId;
    const { read } = req.body;

    const ownerCheck = await query(
      'SELECT user_id FROM notifications WHERE id = $1',
      [notificationId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (ownerCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await query(
      'UPDATE notifications SET read = $1 WHERE id = $2 RETURNING *',
      [read !== undefined ? read : true, notificationId]
    );

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('❌ Update notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

const startServer = async () => {
  try {
    await initializeAuthTable();
    console.log('✅ Database initialized');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 MotiveMe API server running on http://0.0.0.0:${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
