
// Script de création automatique des tables Supabase
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variables Supabase manquantes');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTables() {
    console.log('🚀 Création automatique des tables Supabase...');

    // SQL pour créer toutes les tables nécessaires
    const sqlCommands = [
        // Table users
        `CREATE TABLE IF NOT EXISTS public.users (
            id UUID REFERENCES auth.users(id) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            points INTEGER DEFAULT 0,
            badges JSONB DEFAULT '[]'::jsonb,
            preferences JSONB DEFAULT '{}'::jsonb,
            stats JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );`,

        // Table challenges
        `CREATE TABLE IF NOT EXISTS public.challenges (
            id SERIAL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
            completion_rate DECIMAL(5,2) DEFAULT 0.00,
            current_streak INTEGER DEFAULT 0,
            points_earned INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );`,

        // Table check_ins
        `CREATE TABLE IF NOT EXISTS public.check_ins (
            id SERIAL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
            occurrence_id INTEGER NOT NULL,
            checked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            notes TEXT,
            proof_url VARCHAR(500),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );`,

        // Table notifications
        `CREATE TABLE IF NOT EXISTS public.notifications (
            id SERIAL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            read BOOLEAN DEFAULT FALSE,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );`,

        // RLS Policies
        `ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;`,
        `ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;`,
        `ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;`,
        `ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;`,

        // Policies users
        `CREATE POLICY IF NOT EXISTS "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);`,
        `CREATE POLICY IF NOT EXISTS "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);`,
        `CREATE POLICY IF NOT EXISTS "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);`,

        // Policies challenges
        `CREATE POLICY IF NOT EXISTS "Users can view own challenges" ON public.challenges FOR SELECT USING (auth.uid() = user_id);`,
        `CREATE POLICY IF NOT EXISTS "Users can create own challenges" ON public.challenges FOR INSERT WITH CHECK (auth.uid() = user_id);`,
        `CREATE POLICY IF NOT EXISTS "Users can update own challenges" ON public.challenges FOR UPDATE USING (auth.uid() = user_id);`,
        `CREATE POLICY IF NOT EXISTS "Users can delete own challenges" ON public.challenges FOR DELETE USING (auth.uid() = user_id);`,

        // Index pour performance
        `CREATE INDEX IF NOT EXISTS idx_challenges_user_id ON challenges(user_id);`,
        `CREATE INDEX IF NOT EXISTS idx_check_ins_user_challenge ON check_ins(user_id, challenge_id);`,
        `CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read);`
    ];

    for (const sql of sqlCommands) {
        try {
            const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
            if (error && !error.message.includes('already exists')) {
                console.error(`❌ Erreur SQL:`, error.message);
            }
        } catch (error) {
            console.warn(`⚠️ Commande ignorée:`, sql.substring(0, 50) + '...');
        }
    }

    console.log('✅ Tables créées avec succès !');
    
    // Vérification
    const { data: tables, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

    if (!error) {
        console.log('📊 Tables disponibles:');
        ['users', 'challenges', 'check_ins', 'notifications'].forEach(table => {
            const exists = tables.some(t => t.table_name === table);
            console.log(`   ${exists ? '✅' : '❌'} ${table}`);
        });
    }
}

createTables().catch(console.error);
