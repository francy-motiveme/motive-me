#!/usr/bin/env node

// Script automatique pour créer les tables Supabase via l'API REST
import fetch from 'node-fetch';
import fs from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ Variables d\'environnement manquantes');
    console.error('SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', SERVICE_KEY ? '✅' : '❌');
    process.exit(1);
}

console.log('🚀 Initialisation automatique de la base de données Supabase...\n');

// Lire le script SQL
const sqlScript = fs.readFileSync('supabase_init.sql', 'utf8');

async function executeSQLScript() {
    try {
        // Appeler l'API REST de Supabase pour exécuter le SQL
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`
            },
            body: JSON.stringify({ query: sqlScript })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Script SQL exécuté avec succès !');
        console.log('Résultat:', result);
        
    } catch (error) {
        console.log('⚠️ Méthode automatique non disponible:', error.message);
        console.log('\n📋 SOLUTION MANUELLE:');
        console.log('1. Allez sur https://supabase.com/dashboard');
        console.log('2. Sélectionnez votre projet');
        console.log('3. Cliquez sur "SQL Editor"');
        console.log('4. Copiez le contenu de "supabase_init.sql"');
        console.log('5. Collez et exécutez dans l\'éditeur SQL');
        console.log('\n🎯 Ou utilisez le SQL Editor directement dans le dashboard Supabase');
    }
}

executeSQLScript();
