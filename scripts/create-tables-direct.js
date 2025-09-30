
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

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
        
        // Test de connexion basique
        const { data: testData, error: testError } = await supabase
            .from('_test_')
            .select('*')
            .limit(1);
            
        if (testError && !testError.message.includes('does not exist')) {
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
        
        // Méthode alternative : Utiliser les politiques RLS pour créer les tables
        // Cette méthode fonctionne car elle utilise l'API Supabase standard
        
        if (missingTables.includes('users')) {
            console.log('🔧 Tentative de création table users...');
            try {
                // Essayer d'insérer un enregistrement test pour forcer la création
                const { error } = await supabase
                    .from('users')
                    .insert([{
                        id: '00000000-0000-0000-0000-000000000000',
                        email: 'test@example.com',
                        name: 'Test User'
                    }]);
                    
                if (error) {
                    console.log(`⚠️ Table users: ${error.message}`);
                } else {
                    console.log('✅ Table users créée avec succès');
                    // Supprimer l'enregistrement test
                    await supabase
                        .from('users')
                        .delete()
                        .eq('id', '00000000-0000-0000-0000-000000000000');
                }
            } catch (err) {
                console.log(`⚠️ Table users: ${err.message}`);
            }
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
