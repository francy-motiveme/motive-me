
// Tests d'intégration complets - Application MotiveMe
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import database from '../../js/modules/database.js';
import challengeManager from '../../js/modules/challenges.js';
import authManager from '../../js/modules/auth.js';

describe('Tests d\'Intégration MotiveMe - Flux Complets', () => {
    let testUser = null;
    let testChallenge = null;

    beforeAll(async () => {
        // Configuration test
        console.log('🚀 Configuration tests d\'intégration...');
    });

    afterAll(async () => {
        // Nettoyage
        if (testChallenge) {
            await database.deleteChallenge(testChallenge.id);
        }
        if (testUser) {
            await database.signOut();
        }
    });

    describe('Flux Utilisateur Complet', () => {
        test('Inscription → Connexion → Profil', async () => {
            // 1. Inscription
            const email = `test${Date.now()}@motiveme.com`;
            const password = 'TestPassword123!';
            
            const signupResult = await database.signUp(email, password, {
                name: 'Test User'
            });
            
            expect(signupResult.success).toBe(true);
            expect(signupResult.data.user.email).toBe(email);
            
            // 2. Connexion
            const signinResult = await database.signIn(email, password);
            expect(signinResult.success).toBe(true);
            
            testUser = signinResult.data.user;
            
            // 3. Création profil
            const profileData = {
                id: testUser.id,
                email: email,
                name: 'Test User',
                points: 0,
                badges: [],
                preferences: {},
                stats: {}
            };
            
            const createProfileResult = await database.createUser(profileData);
            expect(createProfileResult.success).toBe(true);
            
            // 4. Récupération profil
            const getProfileResult = await database.getUserById(testUser.id);
            expect(getProfileResult.success).toBe(true);
            expect(getProfileResult.data.name).toBe('Test User');
        });
    });

    describe('Flux Challenge Complet', () => {
        test('Création → Gestion → Check-in', async () => {
            if (!testUser) {
                throw new Error('Test utilisateur requis');
            }

            // 1. Création challenge
            const challengeData = {
                title: 'Test Challenge Intégration',
                duration: 7,
                frequency: 'daily',
                witnessEmail: 'witness@test.com',
                gage: 'Test gage'
            };

            const createResult = await challengeManager.createChallenge(challengeData, testUser.id);
            expect(createResult.success).toBe(true);
            
            testChallenge = createResult.data;
            expect(testChallenge.title).toBe(challengeData.title);

            // 2. Chargement challenges utilisateur
            const loadResult = await challengeManager.loadUserChallenges(testUser.id);
            expect(loadResult.success).toBe(true);
            expect(loadResult.data.length).toBeGreaterThan(0);

            // 3. Check-in
            const checkinResult = await challengeManager.checkIn(
                testChallenge.id, 
                'Test check-in intégration'
            );
            expect(checkinResult.success).toBe(true);
            expect(checkinResult.data.pointsGained).toBeGreaterThan(0);

            // 4. Vérification mise à jour
            const updatedChallenges = await challengeManager.loadUserChallenges(testUser.id);
            const updatedChallenge = updatedChallenges.data.find(c => c.id === testChallenge.id);
            expect(updatedChallenge.points_earned).toBeGreaterThan(0);
        });
    });

    describe('Flux Notifications', () => {
        test('Création → Récupération → Lecture', async () => {
            if (!testUser) {
                throw new Error('Test utilisateur requis');
            }

            // 1. Création notification
            const notifData = {
                user_id: testUser.id,
                type: 'test',
                title: 'Test Notification',
                message: 'Message de test intégration',
                read: false
            };

            const createResult = await database.createNotification(notifData);
            expect(createResult.success).toBe(true);

            // 2. Récupération notifications
            const getResult = await database.getNotificationsByUser(testUser.id);
            expect(getResult.success).toBe(true);
            expect(getResult.data.length).toBeGreaterThan(0);

            const notification = getResult.data.find(n => n.title === 'Test Notification');
            expect(notification).toBeDefined();
            expect(notification.read).toBe(false);

            // 3. Marquer comme lue
            const readResult = await database.markNotificationAsRead(notification.id);
            expect(readResult.success).toBe(true);
            expect(readResult.data.read).toBe(true);
        });
    });

    describe('Tests Performance', () => {
        test('Chargement rapide des données', async () => {
            if (!testUser) {
                throw new Error('Test utilisateur requis');
            }

            const startTime = Date.now();

            // Chargement simultané
            const [challengesResult, notificationsResult] = await Promise.all([
                database.getChallengesByUser(testUser.id),
                database.getNotificationsByUser(testUser.id)
            ]);

            const loadTime = Date.now() - startTime;

            expect(challengesResult.success).toBe(true);
            expect(notificationsResult.success).toBe(true);
            expect(loadTime).toBeLessThan(2000); // Moins de 2 secondes
        });
    });

    describe('Tests Sécurité', () => {
        test('Isolation des données utilisateur', async () => {
            // Tentative d'accès aux données d'un autre utilisateur
            const fakeUserId = '00000000-0000-0000-0000-000000000000';
            
            const result = await database.getChallengesByUser(fakeUserId);
            
            // Devrait retourner un tableau vide, pas d'erreur de sécurité
            expect(result.success).toBe(true);
            expect(result.data).toEqual([]);
        });
    });
});
