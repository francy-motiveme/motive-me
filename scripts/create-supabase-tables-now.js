#!/usr/bin/env node

/**
 * Script pour créer IMMÉDIATEMENT toutes les tables Supabase
 * en utilisant la clé SERVICE_ROLE_KEY
 */

import fs from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ Variables manquantes');
    process.exit(1);
}

console.log('🚀 CRÉATION IMMÉDIATE DES TABLES SUPABASE\n');

// Lire le script SQL
const sqlScript = fs.readFileSync('supabase_init.sql', 'utf8');

// Diviser en commandes individuelles
const commands = sqlScript
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

console.log(`📝 ${commands.length} commandes SQL à exécuter...\n`);

async function executeSQL(sql) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: sql })
    });

    return { ok: response.ok, status: response.status, data: await response.text() };
}

async function createTables() {
    let success = 0;
    let errors = 0;

    for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        if (cmd.trim()) {
            process.stdout.write(`[${i + 1}/${commands.length}] Exécution... `);
            
            try {
                const result = await executeSQL(cmd);
                if (result.ok) {
                    console.log('✅');
                    success++;
                } else {
                    console.log(`⚠️ (${result.status})`);
                    errors++;
                }
            } catch (error) {
                console.log(`❌ ${error.message}`);
                errors++;
            }
        }
    }

    console.log(`\n📊 RÉSULTAT: ${success} succès, ${errors} erreurs\n`);

    if (success > 0) {
        console.log('✅ Tables créées avec succès !');
        console.log('🔄 Rafraîchissez votre application MotiveMe\n');
    } else {
        console.log('⚠️ Échec - Utilisation du plan B...\n');
        await planB();
    }
}

async function planB() {
    console.log('📋 PLAN B: Création via API PostgreSQL directe\n');
    
    // Extraire le nom du projet depuis l'URL
    const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
    
    const tables = `
-- Table users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    points INTEGER DEFAULT 0,
    badges JSONB DEFAULT '[]'::jsonb,
    preferences JSONB DEFAULT '{}'::jsonb,
    stats JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table challenges
CREATE TABLE IF NOT EXISTS challenges (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    duration INTEGER NOT NULL,
    frequency VARCHAR(50) NOT NULL,
    witness_email VARCHAR(255),
    gage TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table check_ins
CREATE TABLE IF NOT EXISTS check_ins (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50),
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`;

    console.log('📋 INSTRUCTIONS FINALES:');
    console.log('1. Allez sur: https://supabase.com/dashboard/project/' + projectRef + '/sql');
    console.log('2. Copiez le SQL ci-dessous:');
    console.log('\n--- SQL À COPIER ---');
    console.log(tables);
    console.log('--- FIN DU SQL ---\n');
    console.log('3. Collez dans l\'éditeur SQL et cliquez sur RUN');
}

createTables();
