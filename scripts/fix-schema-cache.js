#!/usr/bin/env node

/**
 * Script pour diagnostiquer et corriger les problèmes de schema cache Supabase
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 DIAGNOSTIC COMPLET DU SCHEMA SUPABASE\n');
console.log('═'.repeat(60) + '\n');

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ Variables d\'environnement manquantes');
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function diagnoseProblem() {
    try {
        console.log('1️⃣ Test de connexion basique...');
        const { data: session } = await supabaseAdmin.auth.getSession();
        console.log('✅ Connexion établie\n');

        console.log('2️⃣ Tentative de lecture directe des tables...');
        const tables = ['users', 'challenges', 'check_ins', 'notifications'];
        
        for (const table of tables) {
            console.log(`\n📋 Table: ${table}`);
            
            // Test avec la clé service (bypass RLS)
            const { data, error, count } = await supabaseAdmin
                .from(table)
                .select('*', { count: 'exact', head: false })
                .limit(1);
            
            if (error) {
                console.log(`   ❌ Erreur: ${error.message}`);
                console.log(`   📊 Code: ${error.code}`);
                console.log(`   🔍 Détails: ${error.details || 'N/A'}`);
                console.log(`   💡 Hint: ${error.hint || 'N/A'}`);
            } else {
                console.log(`   ✅ Table accessible`);
                console.log(`   📊 Nombre d'enregistrements: ${count || 0}`);
            }
        }

        console.log('\n\n3️⃣ Vérification du schéma avec la clé anon...');
        const ANON_KEY = process.env.SUPABASE_ANON_KEY;
        const supabaseAnon = createClient(SUPABASE_URL, ANON_KEY);
        
        for (const table of tables) {
            const { data, error } = await supabaseAnon
                .from(table)
                .select('count')
                .limit(1);
            
            if (error) {
                console.log(`❌ ${table}: ${error.message}`);
            } else {
                console.log(`✅ ${table}: Accessible avec clé anon`);
            }
        }

        console.log('\n\n4️⃣ RECOMMANDATIONS:');
        console.log('═'.repeat(60));
        console.log(`
Si vous voyez "schema cache" errors:

📋 SOLUTION 1: Rafraîchir le cache Supabase
   1. Allez sur https://supabase.com/dashboard
   2. Sélectionnez votre projet
   3. Allez dans Settings > API
   4. Cliquez sur "Refresh schema cache"

📋 SOLUTION 2: Recréer les tables via SQL Editor
   1. Allez dans SQL Editor
   2. Exécutez: DROP SCHEMA public CASCADE; CREATE SCHEMA public;
   3. Exécutez le contenu de supabase_init.sql
   4. Rafraîchissez la page

📋 SOLUTION 3: Vérifier les politiques RLS
   1. Allez dans Authentication > Policies
   2. Vérifiez que les politiques existent pour chaque table
   3. Vérifiez que la colonne 'id' existe dans la table 'users'

📋 SOLUTION 4: Problème de projet Supabase
   - Vérifiez que SUPABASE_URL correspond bien à votre projet actif
   - URL actuelle: ${SUPABASE_URL}
        `);

    } catch (error) {
        console.error('\n❌ ERREUR CRITIQUE:', error.message);
        console.error('Stack:', error.stack);
    }
}

diagnoseProblem();
