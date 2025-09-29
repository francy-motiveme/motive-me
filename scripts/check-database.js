
// Script de vérification de l'état de la base de données
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://lcbvjrukxjnenzficeci.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

async function checkDatabase() {
    console.log('🔍 Vérification de l\'état de la base de données...\n');

    // Test avec ANON_KEY
    console.log('📡 Test connexion ANON_KEY...');
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
    
    try {
        const { data: anonTest, error: anonError } = await supabaseAnon
            .from('users')
            .select('count(*)')
            .limit(1);
        
        if (anonError) {
            console.log('❌ ANON_KEY:', anonError.message);
        } else {
            console.log('✅ ANON_KEY: Connexion réussie');
        }
    } catch (error) {
        console.log('❌ ANON_KEY: Erreur de connexion');
    }

    // Test avec SERVICE_ROLE_KEY
    if (supabaseServiceKey) {
        console.log('\n🔐 Test connexion SERVICE_ROLE_KEY...');
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        
        try {
            // Vérifier les tables existantes
            const { data: tables, error: tablesError } = await supabaseAdmin
                .rpc('get_schema_version'); // Fonction pour tester les permissions admin

            if (tablesError) {
                console.log('⚠️ SERVICE_ROLE_KEY: Permissions limitées');
                
                // Test alternatif : lister les tables
                const { data: tablesList, error: listError } = await supabaseAdmin
                    .from('information_schema.tables')
                    .select('table_name')
                    .eq('table_schema', 'public')
                    .limit(10);

                if (!listError) {
                    console.log('✅ SERVICE_ROLE_KEY: Connexion réussie');
                    console.log('📊 Tables publiques détectées:');
                    
                    const requiredTables = ['users', 'challenges', 'check_ins', 'notifications'];
                    const existingTables = tablesList.map(t => t.table_name);
                    
                    requiredTables.forEach(table => {
                        if (existingTables.includes(table)) {
                            console.log(`   ✅ ${table}`);
                        } else {
                            console.log(`   ❌ ${table} - MANQUANTE`);
                        }
                    });
                } else {
                    console.log('❌ SERVICE_ROLE_KEY:', listError.message);
                }
            } else {
                console.log('✅ SERVICE_ROLE_KEY: Permissions admin confirmées');
            }
        } catch (error) {
            console.log('❌ SERVICE_ROLE_KEY: Erreur de connexion');
        }
    } else {
        console.log('\n❌ SERVICE_ROLE_KEY: Non configurée dans les secrets');
    }

    console.log('\n🎯 RÉSUMÉ:');
    console.log('- URL Supabase:', supabaseUrl);
    console.log('- ANON_KEY:', supabaseAnonKey ? '✅ Configurée' : '❌ Manquante');
    console.log('- SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Configurée' : '❌ Manquante');
}

checkDatabase();
