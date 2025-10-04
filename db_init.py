
import os
import psycopg2

DATABASE_URL = os.environ.get('DATABASE_URL')

def init_database():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Tables exactement comme dans server/db.js
    tables = [
        # Users
        '''CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            points INTEGER DEFAULT 0,
            badges JSONB DEFAULT '[]'::jsonb,
            preferences JSONB DEFAULT '{}'::jsonb,
            stats JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )''',
        
        # Auth credentials
        '''CREATE TABLE IF NOT EXISTS auth_credentials (
            user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            email_verified BOOLEAN DEFAULT FALSE,
            confirm_token VARCHAR(64),
            confirm_expires TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )''',
        
        # Challenges
        '''CREATE TABLE IF NOT EXISTS challenges (
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
        )'''
    ]
    
    for table in tables:
        cur.execute(table)
    
    conn.commit()
    cur.close()
    conn.close()
    print("✅ Database initialized successfully")

def init_database():
    """Initialize database tables"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        print("🔧 Création des tables...")
        
        # Users table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                points INTEGER DEFAULT 0,
                badges JSONB DEFAULT '[]',
                preferences JSONB DEFAULT '{}',
                stats JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Auth credentials table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS auth_credentials (
                id SERIAL PRIMARY KEY,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                email_verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        cur.close()
        conn.close()
        
        print("✅ Database initialized successfully")
        
    except Exception as e:
        print(f"❌ Database initialization error: {str(e)}")
        raise

if __name__ == '__main__':
    init_database()()
