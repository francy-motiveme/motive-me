
// Test complet des connexions Supabase
import database from '../js/modules/database.js';

async function testSupabaseConnections() {
    console.log('🔍 DÉBUT TEST CONNEXIONS SUPABASE\n');
    
    const results = {
        connection: false,
        auth: false,
        tables: false,
        storage: false,
        realtime: false
    };
    
    // 1. Test connexion client
    console.log('1️⃣ Test connexion client Supabase...');
    try {
        if (database.client) {
            results.connection = true;
            console.log('✅ Client Supabase initialisé');
        }
    } catch (error) {
        console.error('❌ Erreur client:', error.message);
    }
    
    // 2. Test authentification
    console.log('\n2️⃣ Test authentification...');
    try {
        const sessionResult = await database.getCurrentSession();
        results.auth = true;
        console.log('✅ Auth fonctionnel');
        console.log('Session active:', !!sessionResult.session);
    } catch (error) {
        console.error('❌ Erreur auth:', error.message);
    }
    
    // 3. Test tables database
    console.log('\n3️⃣ Test tables database...');
    const tables = ['users', 'challenges', 'check_ins', 'notifications'];
    
    for (const table of tables) {
        try {
            const { data, error } = await database.client
                .from(table)
                .select('count')
                .limit(1);
                
            if (!error) {
                console.log(`✅ Table '${table}' existe`);
                results.tables = true;
            } else {
                console.error(`❌ Table '${table}' manquante:`, error.message);
                if (error.code === 'PGRST205') {
                    console.log(`⚠️  CRITIQUE: Schéma database non appliqué!`);
                }
            }
        } catch (error) {
            console.error(`❌ Erreur test table '${table}':`, error.message);
        }
    }
    
    // 4. Test storage
    console.log('\n4️⃣ Test storage...');
    try {
        const buckets = await database.client.storage.listBuckets();
        if (!buckets.error) {
            results.storage = true;
            console.log('✅ Storage fonctionnel');
            console.log('Buckets disponibles:', buckets.data?.length || 0);
        } else {
            console.error('❌ Erreur storage:', buckets.error.message);
        }
    } catch (error) {
        console.error('❌ Erreur test storage:', error.message);
    }
    
    // 5. Test real-time
    console.log('\n5️⃣ Test real-time...');
    try {
        const channel = database.client.channel('test_connection');
        if (channel) {
            results.realtime = true;
            console.log('✅ Real-time fonctionnel');
            channel.unsubscribe();
        }
    } catch (error) {
        console.error('❌ Erreur real-time:', error.message);
    }
    
    // Résumé final
    console.log('\n📊 RÉSUMÉ CONNEXIONS SUPABASE');
    console.log('================================');
    Object.entries(results).forEach(([test, status]) => {
        const icon = status ? '✅' : '❌';
        console.log(`${icon} ${test.toUpperCase()}: ${status ? 'OK' : 'ÉCHEC'}`);
    });
    
    const successCount = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 SCORE GLOBAL: ${successCount}/${totalTests} (${Math.round(successCount/totalTests*100)}%)`);
    
    if (successCount === totalTests) {
        console.log('🎉 TOUTES LES CONNEXIONS SUPABASE FONCTIONNENT!');
    } else {
        console.log('⚠️  ACTIONS REQUISES POUR CORRIGER LES ÉCHECS');
    }
    
    return results;
}

// Test méthodes CRUD si tables existent
async function testCRUDOperations() {
    console.log('\n🔧 TEST OPÉRATIONS CRUD\n');
    
    // Test création utilisateur
    console.log('1️⃣ Test création utilisateur...');
    try {
        const testUser = {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'test@motiveme.com',
            name: 'Test User',
            points: 0,
            badges: [],
            preferences: {},
            stats: {}
        };
        
        const result = await database.createUser(testUser);
        if (result.success) {
            console.log('✅ Création utilisateur OK');
            
            // Test lecture
            console.log('2️⃣ Test lecture utilisateur...');
            const getResult = await database.getUserById(testUser.id);
            if (getResult.success) {
                console.log('✅ Lecture utilisateur OK');
                
                // Test mise à jour
                console.log('3️⃣ Test mise à jour utilisateur...');
                const updateResult = await database.updateUser(testUser.id, { points: 100 });
                if (updateResult.success) {
                    console.log('✅ Mise à jour utilisateur OK');
                }
            }
        }
    } catch (error) {
        console.error('❌ Erreur CRUD:', error.message);
    }
}

// Export pour utilisation
if (typeof window !== 'undefined') {
    window.testSupabaseConnections = testSupabaseConnections;
    window.testCRUDOperations = testCRUDOperations;
}

export { testSupabaseConnections, testCRUDOperations };
