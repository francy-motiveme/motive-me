
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://eiaxdfkkfhkixnuckkma.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 RÉPARATION AUTOMATIQUE DE TOUTES LES ERREURS...\n');

async function fixAllErrors() {
    // 1. Test connexion Supabase
    console.log('1️⃣ Test connexion Supabase...');
    
    if (!serviceKey) {
        console.log('❌ SERVICE_ROLE_KEY manquante dans les secrets');
        console.log('🔧 Action requise: Ajouter SUPABASE_SERVICE_ROLE_KEY dans les secrets Replit');
        return;
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    
    try {
        // Test basique
        const { data, error } = await supabase.from('users').select('count').limit(1);
        
        if (error) {
            console.log('❌ Erreur connexion:', error.message);
            
            if (error.message.includes('does not exist')) {
                console.log('🔧 Création des tables nécessaire...');
                await createMissingTables(supabase);
            }
        } else {
            console.log('✅ Connexion Supabase OK');
        }
    } catch (err) {
        console.log('❌ Erreur test:', err.message);
    }

    // 2. Vérification variables d'environnement
    console.log('\n2️⃣ Vérification variables d\'environnement...');
    
    const requiredVars = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY', 
        'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    let allVarsOK = true;
    
    for (const varName of requiredVars) {
        const value = process.env[varName];
        if (value) {
            console.log(`✅ ${varName}: Configurée`);
        } else {
            console.log(`❌ ${varName}: Manquante`);
            allVarsOK = false;
        }
    }
    
    if (!allVarsOK) {
        console.log('\n🔧 ACTIONS REQUISES:');
        console.log('1. Aller dans les secrets Replit');
        console.log('2. Ajouter les variables manquantes');
        console.log('3. Redémarrer l\'application');
    }

    console.log('\n✅ DIAGNOSTIC TERMINÉ');
}

async function createMissingTables(supabase) {
    const createUsersTable = `
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
    `;

    try {
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: createUsersTable
        });

        if (error) {
            console.log('⚠️ Impossible de créer les tables automatiquement');
            console.log('🔧 Veuillez exécuter le script SQL manuellement dans Supabase');
        } else {
            console.log('✅ Table users créée');
        }
    } catch (err) {
        console.log('⚠️ Erreur création tables:', err.message);
    }
}

fixAllErrors();
