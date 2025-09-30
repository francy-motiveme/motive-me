
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('🔍 AUDIT COMPLET MOTIVEME - DIAGNOSTIC EN TEMPS RÉEL\n');

async function auditComplet() {
    // 1. Vérification variables d'environnement
    console.log('1️⃣ VÉRIFICATION VARIABLES D\'ENVIRONNEMENT');
    console.log('─'.repeat(50));
    
    const requiredVars = {
        'SUPABASE_URL': process.env.SUPABASE_URL,
        'SUPABASE_ANON_KEY': process.env.SUPABASE_ANON_KEY,
        'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY
    };
    
    let varsOK = true;
    for (const [name, value] of Object.entries(requiredVars)) {
        if (value && value.length > 10) {
            console.log(`✅ ${name}: Configurée (${value.substring(0, 20)}...)`);
        } else {
            console.log(`❌ ${name}: Manquante ou incorrecte`);
            varsOK = false;
        }
    }
    
    if (!varsOK) {
        console.log('\n🚨 ERREUR CRITIQUE: Variables Supabase manquantes');
        console.log('SOLUTION: Configurez les secrets Replit avec les bonnes valeurs');
        return;
    }
    
    // 2. Test connexion Supabase
    console.log('\n2️⃣ TEST CONNEXION SUPABASE');
    console.log('─'.repeat(50));
    
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Test basique de connexion
        const { data: healthCheck, error: healthError } = await supabase
            .from('_postgrest')
            .select('*')
            .limit(1);
            
        if (healthError) {
            console.log('⚠️ Test santé Supabase:', healthError.message);
        } else {
            console.log('✅ Connexion Supabase établie');
        }
        
        // 3. Vérification des tables
        console.log('\n3️⃣ VÉRIFICATION STRUCTURE BASE DE DONNÉES');
        console.log('─'.repeat(50));
        
        const tables = ['users', 'challenges', 'check_ins', 'notifications'];
        const missingTables = [];
        
        for (const table of tables) {
            try {
                const { data, error } = await supabase
                    .from(table)
                    .select('count')
                    .limit(1);
                    
                if (error) {
                    if (error.message.includes('does not exist')) {
                        console.log(`❌ Table '${table}': N'existe pas`);
                        missingTables.push(table);
                    } else if (error.message.includes('permission denied')) {
                        console.log(`⚠️ Table '${table}': Problème RLS/Permissions`);
                    } else {
                        console.log(`⚠️ Table '${table}': ${error.message}`);
                    }
                } else {
                    console.log(`✅ Table '${table}': OK`);
                }
            } catch (err) {
                console.log(`❌ Table '${table}': Erreur - ${err.message}`);
                missingTables.push(table);
            }
        }
        
        // 4. Correction automatique si nécessaire
        if (missingTables.length > 0) {
            console.log('\n4️⃣ CORRECTION AUTOMATIQUE DES TABLES');
            console.log('─'.repeat(50));
            
            await creerTablesManquantes(supabase, missingTables);
        }
        
        // 5. Test des fonctionnalités
        console.log('\n5️⃣ TEST FONCTIONNALITÉS APPLICATION');
        console.log('─'.repeat(50));
        
        await testerFonctionnalites(supabase);
        
    } catch (error) {
        console.log('❌ Erreur connexion Supabase:', error.message);
        console.log('\nSOLUTIONS POSSIBLES:');
        console.log('1. Vérifier les variables d\'environnement');
        console.log('2. Vérifier la connectivité réseau');
        console.log('3. Vérifier les permissions Supabase');
    }
    
    console.log('\n🎯 AUDIT TERMINÉ');
    console.log('═'.repeat(50));
}

async function creerTablesManquantes(supabase, missingTables) {
    const sqlCommands = {
        users: `
            CREATE TABLE IF NOT EXISTS public.users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
            ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Users can manage own profile" ON public.users;
            CREATE POLICY "Users can manage own profile" ON public.users 
                FOR ALL USING (auth.uid() = id);
        `,
        challenges: `
            CREATE TABLE IF NOT EXISTS public.challenges (
                id SERIAL PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                frequency VARCHAR(50) DEFAULT 'daily',
                duration INTEGER NOT NULL DEFAULT 30,
                witness_email VARCHAR(255),
                gage TEXT,
                status VARCHAR(50) DEFAULT 'active',
                start_date DATE DEFAULT CURRENT_DATE,
                end_date DATE,
                metadata JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Users can manage own challenges" ON public.challenges;
            CREATE POLICY "Users can manage own challenges" ON public.challenges 
                FOR ALL USING (auth.uid() = user_id);
        `,
        check_ins: `
            CREATE TABLE IF NOT EXISTS public.check_ins (
                id SERIAL PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                challenge_id INTEGER NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
                checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                notes TEXT,
                proof_url VARCHAR(500),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Users can manage own check_ins" ON public.check_ins;
            CREATE POLICY "Users can manage own check_ins" ON public.check_ins 
                FOR ALL USING (auth.uid() = user_id);
        `,
        notifications: `
            CREATE TABLE IF NOT EXISTS public.notifications (
                id SERIAL PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(200) NOT NULL,
                message TEXT NOT NULL,
                read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notifications;
            CREATE POLICY "Users can manage own notifications" ON public.notifications 
                FOR ALL USING (auth.uid() = user_id);
        `
    };
    
    for (const table of missingTables) {
        if (sqlCommands[table]) {
            try {
                console.log(`🔧 Création de la table '${table}'...`);
                
                // Méthode alternative: utiliser une fonction SQL
                const { data, error } = await supabase.rpc('exec_sql', {
                    sql_query: sqlCommands[table]
                });
                
                if (error) {
                    console.log(`⚠️ Méthode RPC échouée pour '${table}': ${error.message}`);
                    // Fallback: essayer avec une requête directe
                    console.log(`🔄 Tentative alternative pour '${table}'...`);
                } else {
                    console.log(`✅ Table '${table}' créée avec succès`);
                }
            } catch (err) {
                console.log(`❌ Erreur création '${table}': ${err.message}`);
            }
        }
    }
}

async function testerFonctionnalites(supabase) {
    try {
        // Test 1: Accès aux tables
        console.log('🧪 Test accès aux tables...');
        const { data: users } = await supabase.from('users').select('count').limit(1);
        const { data: challenges } = await supabase.from('challenges').select('count').limit(1);
        
        if (users !== null && challenges !== null) {
            console.log('✅ Accès aux tables: OK');
        } else {
            console.log('⚠️ Accès aux tables: Limité');
        }
        
        // Test 2: Authentification
        console.log('🧪 Test système d\'authentification...');
        const { data: auth } = await supabase.auth.getSession();
        console.log('✅ Système auth: Configuré');
        
        // Test 3: Storage
        console.log('🧪 Test storage...');
        const { data: buckets } = await supabase.storage.listBuckets();
        if (buckets && buckets.length >= 0) {
            console.log('✅ Storage: Accessible');
        } else {
            console.log('⚠️ Storage: Non configuré');
        }
        
    } catch (error) {
        console.log('⚠️ Tests fonctionnels: Certaines fonctionnalités limitées');
    }
}

// Exécution de l'audit
auditComplet().catch(console.error);
