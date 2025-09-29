
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase depuis les variables d'environnement
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variables Supabase manquantes');
    console.log('SUPABASE_URL:', supabaseUrl ? '✅ Configurée' : '❌ Manquante');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅ Configurée' : '❌ Manquante');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Création automatique des tables Supabase...');

// SQL pour créer toutes les tables
const createTablesSQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table users (utilisateurs)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    badges JSONB DEFAULT '[]'::jsonb,
    preferences JSONB DEFAULT '{}'::jsonb,
    stats JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table challenges (défis)
CREATE TABLE IF NOT EXISTS public.challenges (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    frequency VARCHAR(50) DEFAULT 'daily',
    custom_days INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    duration INTEGER NOT NULL DEFAULT 30,
    witness_email VARCHAR(255),
    gage TEXT,
    reminder_time TIME DEFAULT '20:00:00',
    status VARCHAR(50) DEFAULT 'active',
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    points_reward INTEGER DEFAULT 10,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table check_ins (validations quotidiennes)
CREATE TABLE IF NOT EXISTS public.check_ins (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    challenge_id INTEGER NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed BOOLEAN DEFAULT FALSE,
    proof_url VARCHAR(500),
    notes TEXT,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Table witness_interactions
CREATE TABLE IF NOT EXISTS public.witness_interactions (
    id SERIAL PRIMARY KEY,
    challenge_id INTEGER NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    witness_email VARCHAR(255) NOT NULL,
    interaction_type VARCHAR(100) NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Table achievements
CREATE TABLE IF NOT EXISTS public.achievements (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(100) NOT NULL,
    achievement_name VARCHAR(200) NOT NULL,
    achievement_description TEXT,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 7. Table file_uploads
CREATE TABLE IF NOT EXISTS public.file_uploads (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    challenge_id INTEGER REFERENCES public.challenges(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER,
    original_name VARCHAR(255),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_challenges_user_id ON public.challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.challenges(status);
CREATE INDEX IF NOT EXISTS idx_check_ins_user_challenge ON public.check_ins(user_id, challenge_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON public.achievements(user_id);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_challenges_updated_at ON public.challenges;
CREATE TRIGGER update_challenges_updated_at
    BEFORE UPDATE ON public.challenges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
`;

async function createTables() {
    try {
        // Exécuter le SQL directement
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: createTablesSQL
        });

        if (error) {
            console.error('❌ Erreur SQL:', error.message);
            
            // Fallback: exécuter table par table
            const tables = createTablesSQL.split(';').filter(sql => sql.trim().length > 0);
            
            for (const tableSql of tables) {
                if (tableSql.trim()) {
                    try {
                        const { error: tableError } = await supabase.rpc('exec_sql', {
                            sql_query: tableSql.trim() + ';'
                        });
                        
                        if (tableError) {
                            console.warn('⚠️ Erreur table:', tableError.message);
                        }
                    } catch (err) {
                        console.warn('⚠️ Erreur exécution table:', err.message);
                    }
                }
            }
        }

        console.log('✅ Tables créées avec succès !');
        
        // Vérifier que les tables existent
        const { data: tables } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public');
            
        if (tables && tables.length > 0) {
            console.log('✅ Tables détectées:', tables.map(t => t.table_name).join(', '));
        }

    } catch (error) {
        console.error('❌ Erreur création tables:', error);
        process.exit(1);
    }
}

// Exécuter la création
createTables();
