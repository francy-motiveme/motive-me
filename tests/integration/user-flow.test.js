// Tests d'intégration - Parcours utilisateur complet
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { MotiveMeApp } from '../../js/app.js';

// Mock des modules externes
jest.mock('../../js/modules/database.js');

describe('Parcours utilisateur complet', () => {
    let app;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="loginScreen" class="screen active"></div>
            <div id="signupScreen" class="screen"></div>
            <div id="dashboardScreen" class="screen"></div>
        `;
        app = new MotiveMeApp();
    });

    describe('Inscription → Connexion → Challenge → Check-in', () => {
        test('devrait permettre un parcours complet d\'inscription à check-in', async () => {
            // Étape 1: Inscription
            const signupData = {
                name: 'Test User',
                email: 'test@example.com',
                password: 'Password123!'
            };

            const signupResult = await app.handleSignup(signupData);
            expect(signupResult.success).toBe(true);

            // Étape 2: Vérifier que l'utilisateur est connecté
            expect(app.isAuthenticated()).toBe(true);
            
            // Étape 3: Créer un challenge
            const challengeData = {
                title: 'Lire 30 min par jour',
                duration: 7,
                frequency: 'daily',
                witnessEmail: 'witness@example.com',
                gage: 'Je donne 20€ à une association'
            };

            const challengeResult = await app.createChallenge(challengeData);
            expect(challengeResult.success).toBe(true);

            // Étape 4: Faire un check-in
            const checkInData = {
                proof_text: 'J\'ai lu "Les Misérables" pendant 30 minutes'
            };

            const checkInResult = await app.submitCheckIn(
                challengeResult.data.id,
                checkInData
            );
            expect(checkInResult.success).toBe(true);
        });
    });

    describe('Gestion des erreurs en parcours', () => {
        test('devrait gérer gracieusement les erreurs de réseau', async () => {
            // Simuler une erreur réseau
            const mockError = new Error('Network error');
            jest.spyOn(app, 'handleNetworkRequest').mockRejectedValue(mockError);

            const signupData = {
                name: 'Test User',
                email: 'test@example.com',
                password: 'Password123!'
            };

            const result = await app.handleSignup(signupData);
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('réseau');
        });
    });
});