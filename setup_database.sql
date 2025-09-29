
-- =============================================
-- SCRIPT DE CORRECTION URGENT - TABLES MANQUANTES
-- À exécuter dans Supabase SQL Editor
-- =============================================

-- 1. Supprimer tables existantes si nécessaire (sécurité)
DROP TABLE IF EXISTS public.file_uploads CASCADE;
DROP TABLE IF EXISTS public.achievements CASCADE;
DROP TABLE IF EXISTS public.witness_interactions CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.check_ins CASCADE;
DROP TABLE IF EXISTS public.challenges CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 2. Table users (CRITIQUE - MANQUANTE)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    badges JSONB DEFAULT '[]'::jsonb,
    preferences JSONB DEFAULT '{"notifications": true, "email_reminders": true, "theme": "light"}'::jsonb,
    stats JSONB DEFAULT '{"challenges_created": 0, "challenges_completed": 0, "total_checkins": 0, "current_streak": 0, "longest_streak": 0}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- 3. Table challenges
CREATE TABLE public.challenges (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    duration INTEGER NOT NULL,
    frequency VARCHAR(50) NOT NULL DEFAULT 'daily',
    custom_days INTEGER[] DEFAULT NULL,
    witness_email VARCHAR(255) NOT NULL,
    gage TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    occurrences JSONB DEFAULT '[]'::jsonb,
    timezone VARCHAR(50) DEFAULT 'Europe/Paris',
    reminder_time TIME DEFAULT '09:00:00',
    completion_rate DECIMAL(5,2) DEFAULT 0.00,
    current_streak INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table check_ins
CREATE TABLE public.check_ins (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    challenge_id INTEGER NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    occurrence_id INTEGER NOT NULL,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    proof_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Table notifications
CREATE TABLE public.notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Table witness_interactions
CREATE TABLE public.witness_interactions (
    id SERIAL PRIMARY KEY,
    challenge_id INTEGER NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    witness_email VARCHAR(255) NOT NULL,
    interaction_type VARCHAR(50) NOT NULL,
    message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Table achievements
CREATE TABLE public.achievements (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(100) NOT NULL,
    achievement_name VARCHAR(200) NOT NULL,
    achievement_description TEXT,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 8. Table file_uploads
CREATE TABLE public.file_uploads (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    challenge_id INTEGER REFERENCES public.challenges(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER,
    original_name VARCHAR(255),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEX POUR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_challenges_user_id ON public.challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.challenges(status);
CREATE INDEX IF NOT EXISTS idx_check_ins_user_challenge ON public.check_ins(user_id, challenge_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON public.achievements(user_id);

-- =============================================
-- TRIGGERS POUR AUTO-UPDATE
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON public.challenges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- POLITIQUES RLS (ROW LEVEL SECURITY)
-- =============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.witness_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

-- Politiques pour users
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Politiques pour challenges
CREATE POLICY "Users can view own challenges" ON public.challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own challenges" ON public.challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own challenges" ON public.challenges FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own challenges" ON public.challenges FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour check_ins
CREATE POLICY "Users can view own check_ins" ON public.check_ins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own check_ins" ON public.check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own check_ins" ON public.check_ins FOR UPDATE USING (auth.uid() = user_id);

-- Politiques pour notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Politiques pour achievements
CREATE POLICY "Users can view own achievements" ON public.achievements FOR SELECT USING (auth.uid() = user_id);

-- Politiques pour file_uploads
CREATE POLICY "Users can view own files" ON public.file_uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upload own files" ON public.file_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- FONCTION HELPER POUR CRÉATION PROFIL AUTO
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, points, level, badges, preferences, stats)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
        0,
        1,
        '[]'::jsonb,
        '{"notifications": true, "email_reminders": true, "theme": "light"}'::jsonb,
        '{"challenges_created": 0, "challenges_completed": 0, "total_checkins": 0, "current_streak": 0, "longest_streak": 0}'::jsonb
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour création automatique profil lors inscription
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- MESSAGE DE CONFIRMATION
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '✅ TOUTES LES TABLES ONT ÉTÉ CRÉÉES AVEC SUCCÈS !';
    RAISE NOTICE '✅ POLITIQUES RLS ACTIVÉES';
    RAISE NOTICE '✅ TRIGGERS CONFIGURÉS';
    RAISE NOTICE '✅ BASE DE DONNÉES PRÊTE POUR MOTIVEME';
END $$;
