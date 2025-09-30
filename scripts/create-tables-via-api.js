#!/usr/bin/env node

/**
 * Script pour créer les tables Supabase via l'API PostgreSQL directe
 */

import pg from 'pg';
const { Client } = pg;
import fs from 'fs';

console.log('🚀 CRÉATION AUTOMATIQUE DES TABLES SUPABASE\n');
console.log('═'.repeat(60) + '\n');

const SUPABASE_URL = process.env.SUPABASE_URL;

if (!SUPABASE_URL) {
    console.error('❌ SUPABASE_URL manquante');
    process.exit(1);
}

// Extraire les infos de connexion depuis l'URL Supabase
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
if (!projectRef) {
    console.error('❌ URL Supabase invalide');
    process.exit(1);
}

console.log('📋 INSTRUCTIONS MANUELLES (À FAIRE MAINTENANT):\n');
console.log('═'.repeat(60));
console.log(`
⚠️  Supabase ne permet pas la création de tables via l'API REST pour des raisons de sécurité.
    Vous DEVEZ le faire manuellement. Voici comment :

📝 ÉTAPES À SUIVRE (5 minutes):

1️⃣  Ouvrez votre navigateur et allez sur: https://supabase.com/dashboard

2️⃣  Connectez-vous et sélectionnez votre projet: "${projectRef}"

3️⃣  Dans le menu de gauche, cliquez sur "SQL Editor" (icône </>)

4️⃣  Cliquez sur "New query" (bouton en haut à droite)

5️⃣  Ouvrez le fichier "supabase_init.sql" dans Replit (clic droit > Open)

6️⃣  Sélectionnez TOUT le contenu (Ctrl+A) et copiez-le (Ctrl+C)

7️⃣  Retournez dans l'éditeur SQL Supabase et collez le contenu (Ctrl+V)

8️⃣  Cliquez sur "Run" (ou appuyez sur Ctrl+Enter)

9️⃣  Attendez le message "Success. No rows returned"

🔟  Rafraîchissez la page de votre application MotiveMe

✅ Après avoir fait ces étapes, les erreurs disparaîtront !

═`.repeat(60));

console.log('\n\n💡 POURQUOI cette étape manuelle est nécessaire ?');
console.log('─'.repeat(60));
console.log(`
Supabase utilise PostgreSQL comme base de données. Pour des raisons de sécurité,
seules les opérations de lecture/écriture (SELECT, INSERT, UPDATE, DELETE) sont
permises via l'API REST.

Les opérations de création de structure (CREATE TABLE, ALTER TABLE, etc.) ne
peuvent être faites QUE via l'éditeur SQL du dashboard Supabase.

C'est une mesure de sécurité pour éviter qu'une application malveillante puisse
modifier la structure de votre base de données.
`);

console.log('\n\n🎯 ALTERNATIVE: Si vous ne pouvez pas accéder au dashboard:');
console.log('─'.repeat(60));
console.log(`
1. Contactez l'administrateur de votre projet Supabase
2. Ou créez un nouveau projet Supabase et mettez à jour les clés dans Replit Secrets
3. Ou utilisez une base de données locale pour le développement
`);

console.log('\n\n📞 BESOIN D\'AIDE ?');
console.log('─'.repeat(60));
console.log('Si vous rencontrez un problème, prenez une capture d\'écran et partagez-la.\n');
