
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://eiaxdfkkfhkixnuckkma.supabase.co';
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Vérification de l\'état de la base de données...\n');

// Test avec ANON_KEY
if (anonKey) {
    console.log('📡 Test connexion ANON_KEY...');
    const anonClient = createClient(supabaseUrl, anonKey);
    
    try {
        const { data, error } = await anonClient
            .from('users')
            .select('id')
            .limit(1);
            
        if (error) {
            console.log('❌ ANON_KEY:', error.message);
        } else {
            console.log('✅ ANON_KEY: Connexion réussie');
        }
    } catch (error) {
        console.log('❌ ANON_KEY:', error.message);
    }
} else {
    console.log('❌ ANON_KEY: Non configurée');
}

console.log('');

// Test avec SERVICE_ROLE_KEY
if (serviceKey) {
    console.log('🔐 Test connexion SERVICE_ROLE_KEY...');
    const serviceClient = createClient(supabaseUrl, serviceKey);
    
    try {
        // Test de lecture des tables système
        const { data: tables, error: tablesError } = await serviceClient
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .limit(5);
            
        if (tablesError) {
            console.log('❌ SERVICE_ROLE_KEY:', tablesError.message);
        } else {
            console.log('✅ SERVICE_ROLE_KEY: Connexion réussie');
            if (tables && tables.length > 0) {
                console.log('📋 Tables détectées:', tables.map(t => t.table_name).join(', '));
            } else {
                console.log('⚠️ Aucune table détectée - Il faut créer le schéma');
            }
        }
    } catch (error) {
        console.log('❌ SERVICE_ROLE_KEY:', error.message);
    }
} else {
    console.log('❌ SERVICE_ROLE_KEY: Non configurée');
}

console.log('\n🎯 RÉSUMÉ:');
console.log('- URL Supabase:', supabaseUrl);
console.log('- ANON_KEY:', anonKey ? '✅ Configurée' : '❌ Manquante');
console.log('- SERVICE_ROLE_KEY:', serviceKey ? '✅ Configurée' : '❌ Manquante');

// Recommandations
if (!anonKey || !serviceKey) {
    console.log('\n🔧 ACTIONS REQUISES:');
    console.log('1. Vérifier les variables d\'environnement dans Secrets');
    console.log('2. VITE_SUPABASE_ANON_KEY doit être définie');
    console.log('3. VITE_SUPABASE_SERVICE_ROLE_KEY doit être définie');
    console.log('4. Exécuter: node scripts/create-tables.js');
}
