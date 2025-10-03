import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('✅ Query executed', { text: text.substring(0, 50), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('❌ Query error', { text: text.substring(0, 50), error: error.message });
    throw error;
  }
};

export const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);

  const timeout = setTimeout(() => {
    console.error('❌ Client has been checked out for more than 5 seconds!');
  }, 5000);

  client.query = (...args) => {
    return query(...args);
  };

  client.release = () => {
    clearTimeout(timeout);
    client.query = query;
    client.release = release;
    return release();
  };

  return client;
};

export const initializeDatabase = async () => {
  console.log('🔧 Creating database tables in correct order...');
  
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      points INTEGER DEFAULT 0,
      badges JSONB DEFAULT '[]'::jsonb,
      preferences JSONB DEFAULT '{}'::jsonb,
      stats JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `;

  const createAuthTable = `
    CREATE TABLE IF NOT EXISTS auth_credentials (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email_verified BOOLEAN DEFAULT FALSE,
      confirm_token VARCHAR(64),
      confirm_expires TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_auth_email ON auth_credentials(email);
    CREATE INDEX IF NOT EXISTS idx_auth_token ON auth_credentials(confirm_token);
  `;

  const createChallengesTable = `
    CREATE TABLE IF NOT EXISTS challenges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      duration INTEGER NOT NULL,
      frequency VARCHAR(50) NOT NULL,
      custom_days JSONB DEFAULT '[]'::jsonb,
      witness_email VARCHAR(255),
      gage TEXT,
      status VARCHAR(50) DEFAULT 'active',
      start_date TIMESTAMP WITH TIME ZONE,
      end_date TIMESTAMP WITH TIME ZONE,
      occurrences JSONB DEFAULT '[]'::jsonb,
      timezone VARCHAR(100),
      reminder_time VARCHAR(10),
      completion_rate INTEGER DEFAULT 0,
      current_streak INTEGER DEFAULT 0,
      points_earned INTEGER DEFAULT 0,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_challenges_user ON challenges(user_id);
    CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);
  `;

  const createCheckInsTable = `
    CREATE TABLE IF NOT EXISTS check_ins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
      check_date DATE NOT NULL,
      notes TEXT,
      proof_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_checkins_user ON check_ins(user_id);
    CREATE INDEX IF NOT EXISTS idx_checkins_challenge ON check_ins(challenge_id);
  `;

  const createNotificationsTable = `
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      read BOOLEAN DEFAULT FALSE,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
  `;

  const createWitnessInteractionsTable = `
    CREATE TABLE IF NOT EXISTS witness_interactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
      witness_email VARCHAR(255) NOT NULL,
      interaction_type VARCHAR(50) NOT NULL,
      message TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_witness_challenge ON witness_interactions(challenge_id);
  `;

  const createAchievementsTable = `
    CREATE TABLE IF NOT EXISTS achievements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      badge_id VARCHAR(100) NOT NULL,
      earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      metadata JSONB DEFAULT '{}'::jsonb
    );
    CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
  `;

  const createFileUploadsTable = `
    CREATE TABLE IF NOT EXISTS file_uploads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      file_name VARCHAR(255) NOT NULL,
      file_url TEXT NOT NULL,
      file_type VARCHAR(100),
      file_size INTEGER,
      uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_uploads_user ON file_uploads(user_id);
  `;

  const createUpdateTrigger = `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_challenges_updated_at ON challenges;
    CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON challenges
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `;

  try {
    await query(createUsersTable);
    console.log('✅ Users table created/verified');
    
    await query(createAuthTable);
    console.log('✅ Auth credentials table created/verified');
    
    await query(createChallengesTable);
    console.log('✅ Challenges table created/verified');
    
    await query(createCheckInsTable);
    console.log('✅ Check-ins table created/verified');
    
    await query(createNotificationsTable);
    console.log('✅ Notifications table created/verified');
    
    await query(createWitnessInteractionsTable);
    console.log('✅ Witness interactions table created/verified');
    
    await query(createAchievementsTable);
    console.log('✅ Achievements table created/verified');
    
    await query(createFileUploadsTable);
    console.log('✅ File uploads table created/verified');
    
    await query(createUpdateTrigger);
    console.log('✅ Update triggers created/verified');
    
    console.log('✅ All database tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    throw error;
  }
};

export default pool;
