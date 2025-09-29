-- ============================================================================
-- SCRIPT D'INITIALISATION SUPABASE POUR MOTIVEME
-- ============================================================================
-- Ce script crée toutes les tables, triggers, et politiques de sécurité
-- nécessaires pour faire fonctionner l'application MotiveMe
-- ============================================================================

-- ==========================
-- 1. TABLE USERS (Profils utilisateurs)
-- ==========================
CREATE TABLE IF NOT EXISTS public.users (
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

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);

-- ==========================
-- 2. TABLE CHALLENGES (Défis utilisateurs)
-- ==========================
CREATE TABLE IF NOT EXISTS public.challenges (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    duration INTEGER NOT NULL,
    frequency VARCHAR(50) NOT NULL,
    custom_days INTEGER[] DEFAULT '{}',
    witness_email VARCHAR(255),
    gage TEXT,
    status VARCHAR(50) DEFAULT 'active',
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    occurrences JSONB,
    timezone VARCHAR(100),
    reminder_time TIME,
    completion_rate DECIMAL(5, 2) DEFAULT 0.00,
    current_streak INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_challenges_user_id ON public.challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_created_at ON public.challenges(created_at);

-- ==========================
-- 3. TABLE CHECK_INS (Validations quotidiennes)
-- ==========================
CREATE TABLE IF NOT EXISTS public.check_ins (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    challenge_id INTEGER REFERENCES public.challenges(id) ON DELETE CASCADE,
    occurrence_id VARCHAR(100),
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    proof_url VARCHAR(500)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_checkins_challenge_id ON public.check_ins(challenge_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON public.check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_checked_at ON public.check_ins(checked_at);

-- ==========================
-- 4. TABLE NOTIFICATIONS
-- ==========================
CREATE TABLE IF NOT EXISTS public.notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50),
    title VARCHAR(200),
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- ==========================
-- 5. TABLE WITNESS_INTERACTIONS
-- ==========================
CREATE TABLE IF NOT EXISTS public.witness_interactions (
    id SERIAL PRIMARY KEY,
    challenge_id INTEGER REFERENCES public.challenges(id) ON DELETE CASCADE,
    witness_email VARCHAR(255),
    interaction_type VARCHAR(50),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_witness_interactions_challenge_id ON public.witness_interactions(challenge_id);

-- ==========================
-- 6. TABLE ACHIEVEMENTS
-- ==========================
CREATE TABLE IF NOT EXISTS public.achievements (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(100),
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON public.achievements(user_id);

-- ==========================
-- 7. TABLE FILE_UPLOADS
-- ==========================
CREATE TABLE IF NOT EXISTS public.file_uploads (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    challenge_id INTEGER REFERENCES public.challenges(id) ON DELETE CASCADE,
    file_path VARCHAR(500),
    file_type VARCHAR(50),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id ON public.file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_challenge_id ON public.file_uploads(challenge_id);

-- ============================================================================
-- TRIGGERS - Mise à jour automatique de updated_at
-- ============================================================================

-- Fonction générique pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour users
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour challenges
DROP TRIGGER IF EXISTS update_challenges_updated_at ON public.challenges;
CREATE TRIGGER update_challenges_updated_at
    BEFORE UPDATE ON public.challenges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- POLITIQUES RLS (Row Level Security)
-- ============================================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.witness_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

-- Politiques pour USERS
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Politiques pour CHALLENGES
DROP POLICY IF EXISTS "Users can view their own challenges" ON public.challenges;
CREATE POLICY "Users can view their own challenges"
    ON public.challenges FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own challenges" ON public.challenges;
CREATE POLICY "Users can create their own challenges"
    ON public.challenges FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own challenges" ON public.challenges;
CREATE POLICY "Users can update their own challenges"
    ON public.challenges FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own challenges" ON public.challenges;
CREATE POLICY "Users can delete their own challenges"
    ON public.challenges FOR DELETE
    USING (auth.uid() = user_id);

-- Politiques pour CHECK_INS
DROP POLICY IF EXISTS "Users can view their own check-ins" ON public.check_ins;
CREATE POLICY "Users can view their own check-ins"
    ON public.check_ins FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own check-ins" ON public.check_ins;
CREATE POLICY "Users can create their own check-ins"
    ON public.check_ins FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own check-ins" ON public.check_ins;
CREATE POLICY "Users can update their own check-ins"
    ON public.check_ins FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own check-ins" ON public.check_ins;
CREATE POLICY "Users can delete their own check-ins"
    ON public.check_ins FOR DELETE
    USING (auth.uid() = user_id);

-- Politiques pour NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Politiques pour WITNESS_INTERACTIONS
DROP POLICY IF EXISTS "Users can view witness interactions for their challenges" ON public.witness_interactions;
CREATE POLICY "Users can view witness interactions for their challenges"
    ON public.witness_interactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.challenges
            WHERE challenges.id = witness_interactions.challenge_id
            AND challenges.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert witness interactions for their challenges" ON public.witness_interactions;
CREATE POLICY "Users can insert witness interactions for their challenges"
    ON public.witness_interactions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.challenges
            WHERE challenges.id = witness_interactions.challenge_id
            AND challenges.user_id = auth.uid()
        )
    );

-- Politiques pour ACHIEVEMENTS
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.achievements;
CREATE POLICY "Users can view their own achievements"
    ON public.achievements FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.achievements;
CREATE POLICY "Users can insert their own achievements"
    ON public.achievements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Politiques pour FILE_UPLOADS
DROP POLICY IF EXISTS "Users can view their own file uploads" ON public.file_uploads;
CREATE POLICY "Users can view their own file uploads"
    ON public.file_uploads FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own file uploads" ON public.file_uploads;
CREATE POLICY "Users can create their own file uploads"
    ON public.file_uploads FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own file uploads" ON public.file_uploads;
CREATE POLICY "Users can delete their own file uploads"
    ON public.file_uploads FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
-- Toutes les tables, triggers et politiques sont maintenant configurés
-- Vous pouvez maintenant utiliser l'application MotiveMe !
-- ============================================================================
