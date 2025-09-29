-- =============================================
-- SCHÉMA COMPLET MOTIVEME SUPABASE
-- =============================================

-- 1. Table users (utilisateurs)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    points INTEGER DEFAULT 0,
    badges JSONB DEFAULT '[]'::jsonb,
    preferences JSONB DEFAULT '{}'::jsonb,
    stats JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Table challenges (défis)
CREATE TABLE IF NOT EXISTS challenges (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    duration INTEGER NOT NULL,
    frequency VARCHAR(50) NOT NULL DEFAULT 'daily',
    custom_days INTEGER[] DEFAULT NULL,
    witness_email VARCHAR(255) NOT NULL,
    gage TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    end_date TIMESTAMP WITH TIME ZONE,
    occurrences JSONB DEFAULT '[]'::jsonb,
    timezone VARCHAR(50) DEFAULT 'Europe/Paris',
    reminder_time TIME DEFAULT '09:00:00',
    completion_rate DECIMAL(5,2) DEFAULT 0.00,
    current_streak INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Table check_ins (vérifications quotidiennes)
CREATE TABLE IF NOT EXISTS check_ins (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    occurrence_id INTEGER NOT NULL,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    notes TEXT,
    proof_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Table notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Table witness_interactions (interactions témoins)
CREATE TABLE IF NOT EXISTS witness_interactions (
    id SERIAL PRIMARY KEY,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    witness_email VARCHAR(255) NOT NULL,
    interaction_type VARCHAR(50) NOT NULL,
    message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Table achievements (accomplissements/badges)
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(100) NOT NULL,
    achievement_name VARCHAR(200) NOT NULL,
    achievement_description TEXT,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 7. Table file_uploads (uploads de fichiers)
CREATE TABLE IF NOT EXISTS file_uploads (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER,
    original_name VARCHAR(255),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- INDEX POUR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_challenges_user_id ON challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_check_ins_user_challenge ON check_ins(user_id, challenge_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);

-- =============================================
-- TRIGGERS POUR AUTO-UPDATE
-- =============================================

-- Trigger pour update automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON challenges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- POLITIQUES RLS (ROW LEVEL SECURITY)
-- =============================================

-- Activer RLS sur toutes les tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE witness_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- Politiques pour users
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Politiques pour challenges
CREATE POLICY "Users can view own challenges" ON challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own challenges" ON challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own challenges" ON challenges FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own challenges" ON challenges FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour check_ins
CREATE POLICY "Users can view own check_ins" ON check_ins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own check_ins" ON check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own check_ins" ON check_ins FOR UPDATE USING (auth.uid() = user_id);

-- Politiques pour notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Politiques pour achievements
CREATE POLICY "Users can view own achievements" ON achievements FOR SELECT USING (auth.uid() = user_id);

-- Politiques pour file_uploads
CREATE POLICY "Users can view own files" ON file_uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upload own files" ON file_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- DONNÉES DE TEST (OPTIONNEL)
-- =============================================

-- Fonction pour créer un utilisateur de test si nécessaire
CREATE OR REPLACE FUNCTION create_test_user_if_not_exists()
RETURNS void AS $$
BEGIN
    -- Cette fonction sera appelée après l'authentification
    INSERT INTO users (id, email, name, points, badges, preferences, stats)
    VALUES (
        auth.uid(),
        auth.email(),
        COALESCE(auth.raw_user_meta_data() ->> 'name', split_part(auth.email(), '@', 1)),
        0,
        '[]'::jsonb,
        '{}'::jsonb,
        '{}'::jsonb
    ) ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;