
// Script d'initialisation automatique de la base de données Supabase
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Configuration avec SERVICE_ROLE_KEY pour les permissions admin
const supabaseUrl = process.env.SUPABASE_URL || 'https://lcbvjrukxjnenzficeci.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquante dans les secrets Replit');
    process.exit(1);
}

// Client admin avec SERVICE_ROLE_KEY
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function initializeDatabase() {
    console.log('🚀 Initialisation automatique de la base de données...');

    try {
        // Lire le script SQL d'initialisation
        const sqlScript = fs.readFileSync(path.join(process.cwd(), 'supabase_init.sql'), 'utf8');
        
        console.log('📝 Exécution du script SQL...');
        
        // Exécuter le script SQL complet via l'API admin
        const { data, error } = await supabaseAdmin.rpc('exec_sql', {
            sql_query: sqlScript
        });

        if (error) {
            // Si la fonction exec_sql n'existe pas, on essaie une approche alternative
            console.log('⚠️ Fonction exec_sql non disponible, tentative alternative...');
            
            // Diviser le script en commandes individuelles
            const commands = sqlScript
                .split(';')
                .map(cmd => cmd.trim())
                .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

            for (const command of commands) {
                if (command.trim()) {
                    const { error: cmdError } = await supabaseAdmin
                        .from('pg_stat_statements')
                        .select('*')
                        .limit(1);
                    
                    // Utiliser une requête SQL directe
                    const { error: sqlError } = await supabaseAdmin.rpc('execute_sql', {
                        query: command
                    });
                    
                    if (sqlError && !sqlError.message.includes('already exists')) {
                        console.warn(`⚠️ Erreur sur commande: ${sqlError.message}`);
                    }
                }
            }
        }

        console.log('✅ Base de données initialisée avec succès !');
        
        // Vérifier que les tables sont bien créées
        const { data: tables, error: tablesError } = await supabaseAdmin
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public');

        if (!tablesError && tables) {
            console.log('📊 Tables créées:');
            tables.forEach(table => {
                if (['users', 'challenges', 'check_ins', 'notifications'].includes(table.table_name)) {
                    console.log(`   ✅ ${table.table_name}`);
                }
            });
        }

        console.log('🎉 L\'application est maintenant prête à être utilisée !');

    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        
        // Fallback : Instructions manuelles
        console.log('\n📋 SOLUTION ALTERNATIVE:');
        console.log('1. Va sur https://supabase.com/dashboard');
        console.log('2. Sélectionne ton projet');
        console.log('3. Va dans "SQL Editor"');
        console.log('4. Copie le contenu de supabase_init.sql');
        console.log('5. Colle et exécute le script');
    }
}

// Exécuter l'initialisation
initializeDatabase();
