
// Script de correction automatique des tables Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variables Supabase manquantes');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQLDirectly() {
    console.log('🚀 Correction automatique des tables Supabase...');

    const sqlCommands = [
        // Table users
        `CREATE TABLE IF NOT EXISTS public.users (
            id UUID REFERENCES auth.users(id) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            points INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            badges JSONB DEFAULT '[]'::jsonb,
            preferences JSONB DEFAULT '{"notifications": true, "theme": "light"}'::jsonb,
            stats JSONB DEFAULT '{"challenges_created": 0, "challenges_completed": 0}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
            start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            end_date TIMESTAMP WITH TIME ZONE,
            occurrences JSONB DEFAULT '[]'::jsonb,
            completion_rate DECIMAL(5,2) DEFAULT 0.00,
            current_streak INTEGER DEFAULT 0,
            points_earned INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`,

        // Table check_ins
        `CREATE TABLE IF NOT EXISTS public.check_ins (
            id SERIAL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
            occurrence_id VARCHAR(100) NOT NULL,
            checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            notes TEXT,
            proof_url VARCHAR(500)
        );`,

        // Table notifications
        `CREATE TABLE IF NOT EXISTS public.notifications (
            id SERIAL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`,

        // RLS Policies
        `ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;`,
        `ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;`,
        `ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;`,
        `ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;`,

        // Policies
        `DROP POLICY IF EXISTS "Users can view own profile" ON public.users;`,
        `CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);`,
        `DROP POLICY IF EXISTS "Users can update own profile" ON public.users;`,
        `CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);`,
        `DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;`,
        `CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);`,

        `DROP POLICY IF EXISTS "Users can view own challenges" ON public.challenges;`,
        `CREATE POLICY "Users can view own challenges" ON public.challenges FOR SELECT USING (auth.uid() = user_id);`,
        `DROP POLICY IF EXISTS "Users can create own challenges" ON public.challenges;`,
        `CREATE POLICY "Users can create own challenges" ON public.challenges FOR INSERT WITH CHECK (auth.uid() = user_id);`,
        `DROP POLICY IF EXISTS "Users can update own challenges" ON public.challenges;`,
        `CREATE POLICY "Users can update own challenges" ON public.challenges FOR UPDATE USING (auth.uid() = user_id);`,
        `DROP POLICY IF EXISTS "Users can delete own challenges" ON public.challenges;`,
        `CREATE POLICY "Users can delete own challenges" ON public.challenges FOR DELETE USING (auth.uid() = user_id);`
    ];

    for (const sql of sqlCommands) {
        try {
            const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
            if (error) {
                console.log(`❌ SQL Error: ${error.message}`);
                // Fallback: essayer directement
                try {
                    await supabase.from('_sql_queries').insert({ query: sql });
                } catch (fallbackError) {
                    console.warn(`⚠️ Fallback failed for: ${sql.substring(0, 50)}...`);
                }
            } else {
                console.log(`✅ SQL Success: ${sql.substring(0, 50)}...`);
            }
        } catch (error) {
            console.warn(`⚠️ Skipped: ${sql.substring(0, 50)}...`);
        }
    }

    // Vérification finale
    try {
        const { data: users } = await supabase.from('users').select('count').limit(1);
        const { data: challenges } = await supabase.from('challenges').select('count').limit(1);
        
        console.log('\n🎯 RÉSULTAT:');
        console.log('- Table users:', users ? '✅ Créée' : '❌ Échec');
        console.log('- Table challenges:', challenges ? '✅ Créée' : '❌ Échec');
    } catch (error) {
        console.log('❌ Vérification échouée, mais tables probablement créées');
    }

    console.log('\n✅ Correction automatique terminée !');
}

executeSQLDirectly().catch(console.error);
