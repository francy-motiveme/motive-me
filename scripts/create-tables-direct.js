
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Création directe des tables Supabase...\n');

if (!supabaseUrl || !serviceKey) {
    console.error('❌ Variables manquantes:');
    console.error('- VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
    console.error('- VITE_SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✅' : '❌');
    console.error('\n🔧 SOLUTION: Configurez les secrets dans Replit');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function createTablesDirectly() {
    try {
        console.log('1️⃣ Test de connexion Supabase...');
        
        // Test de connexion basique - utiliser une requête qui fonctionne même sans tables
        const { data: testData, error: testError } = await supabase
            .rpc('version')
            .then(() => ({ data: true, error: null }))
            .catch(async () => {
                // Si RPC ne marche pas, tester avec une requête simple sur information_schema
                return await supabase
                    .from('information_schema.tables')
                    .select('table_name')
                    .limit(1);
            });
            
        if (testError && !testError.message.includes('does not exist') && !testError.message.includes('schema cache')) {
            throw new Error(`Connexion échouée: ${testError.message}`);
        }
        
        console.log('✅ Connexion Supabase réussie');
        
        console.log('\n2️⃣ Vérification des tables existantes...');
        
        // Vérifier quelles tables existent déjà
        const tables = ['users', 'challenges', 'check_ins', 'notifications'];
        const existingTables = [];
        const missingTables = [];
        
        for (const table of tables) {
            try {
                const { data, error } = await supabase
                    .from(table)
                    .select('count')
                    .limit(1);
                    
                if (error && error.message.includes('does not exist')) {
                    missingTables.push(table);
                    console.log(`❌ Table '${table}': N'existe pas`);
                } else {
                    existingTables.push(table);
                    console.log(`✅ Table '${table}': Existe déjà`);
                }
            } catch (err) {
                missingTables.push(table);
                console.log(`❌ Table '${table}': Erreur - ${err.message}`);
            }
        }
        
        if (missingTables.length === 0) {
            console.log('\n🎉 TOUTES LES TABLES EXISTENT DÉJÀ !');
            console.log('Votre base de données est correctement configurée.');
            return;
        }
        
        console.log(`\n3️⃣ Création de ${missingTables.length} tables manquantes...`);
        
        // Exécuter le SQL de création des tables
        console.log('🔧 Exécution du script SQL de création...');
        
        const createTablesSQL = `
        -- Table users
        CREATE TABLE IF NOT EXISTS public.users (
            id UUID REFERENCES auth.users(id) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            points INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            badges JSONB DEFAULT '[]'::jsonb,
            preferences JSONB DEFAULT '{"notifications": true}'::jsonb,
            stats JSONB DEFAULT '{"challenges_created": 0}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Table challenges
        CREATE TABLE IF NOT EXISTS public.challenges (
            id SERIAL PRIMARY KEY,
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            title VARCHAR(100) NOT NULL,
            duration INTEGER NOT NULL,
            frequency VARCHAR(50) NOT NULL,
            witness_email VARCHAR(255),
            gage TEXT,
            status VARCHAR(50) DEFAULT 'active',
            start_date TIMESTAMP WITH TIME ZONE,
            end_date TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Table check_ins
        CREATE TABLE IF NOT EXISTS public.check_ins (
            id SERIAL PRIMARY KEY,
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            challenge_id INTEGER REFERENCES public.challenges(id) ON DELETE CASCADE,
            occurrence_id VARCHAR(100),
            checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            notes TEXT
        );

        -- Table notifications
        CREATE TABLE IF NOT EXISTS public.notifications (
            id SERIAL PRIMARY KEY,
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            type VARCHAR(50),
            title VARCHAR(200),
            message TEXT,
            read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Activer RLS
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

        -- Politiques de base
        CREATE POLICY IF NOT EXISTS "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
        CREATE POLICY IF NOT EXISTS "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
        CREATE POLICY IF NOT EXISTS "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
        `;

        try {
            // Utiliser la fonction rpc pour exécuter du SQL
            const { data: sqlResult, error: sqlError } = await supabase.rpc('exec_sql', { sql: createTablesSQL });
            
            if (sqlError) {
                console.log('⚠️ Erreur SQL RPC:', sqlError.message);
                console.log('📋 SOLUTION MANUELLE REQUISE - Copiez le SQL ci-dessous dans l\'éditeur SQL Supabase:');
                console.log('\n--- DÉBUT DU SQL ---');
                console.log(createTablesSQL);
                console.log('--- FIN DU SQL ---\n');
            } else {
                console.log('✅ Tables créées avec succès via SQL');
            }
        } catch (sqlErr) {
            console.log('⚠️ Méthode SQL non disponible');
            console.log('📋 SOLUTION MANUELLE REQUISE:');
            console.log('1. Allez sur https://supabase.com/dashboard');
            console.log('2. Sélectionnez votre projet');
            console.log('3. Cliquez sur "SQL Editor"');
            console.log('4. Copiez et exécutez le contenu du fichier "supabase_init.sql"');
        }
        
        console.log('\n4️⃣ Vérification finale...');
        
        // Vérification finale
        let finalCheck = 0;
        for (const table of tables) {
            try {
                const { data, error } = await supabase
                    .from(table)
                    .select('count')
                    .limit(1);
                    
                if (!error || !error.message.includes('does not exist')) {
                    finalCheck++;
                    console.log(`✅ Table '${table}': Accessible`);
                } else {
                    console.log(`❌ Table '${table}': Toujours manquante`);
                }
            } catch (err) {
                console.log(`❌ Table '${table}': Erreur - ${err.message}`);
            }
        }
        
        console.log('\n🎯 RÉSULTAT FINAL:');
        console.log(`Tables fonctionnelles: ${finalCheck}/${tables.length}`);
        
        if (finalCheck === 0) {
            console.log('\n⚠️ ATTENTION: Aucune table créée automatiquement');
            console.log('📋 SOLUTION MANUELLE REQUISE:');
            console.log('1. Allez sur https://supabase.com/dashboard');
            console.log('2. Sélectionnez votre projet');
            console.log('3. Cliquez sur "SQL Editor"');
            console.log('4. Copiez le contenu du fichier "supabase_init.sql"');
            console.log('5. Collez et exécutez dans l\'éditeur SQL');
        } else if (finalCheck < tables.length) {
            console.log('\n⚠️ Création partielle - Certaines tables manquent encore');
            console.log('📋 Utilisez la méthode manuelle pour les tables restantes');
        } else {
            console.log('\n🎉 SUCCÈS COMPLET - Toutes les tables sont prêtes !');
        }
        
    } catch (error) {
        console.error('\n❌ ERREUR CRITIQUE:', error.message);
        console.log('\n🔧 ACTIONS À VÉRIFIER:');
        console.log('1. Les secrets Replit sont-ils configurés ?');
        console.log('2. Les clés Supabase sont-elles valides ?');
        console.log('3. Le projet Supabase est-il actif ?');
    }
}

createTablesDirectly();
