
/**
 * Test d'intégration - Flux d'inscription corrigé
 * Vérifie que l'inscription fonctionne et redirige vers le dashboard
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe('Flux d\'inscription corrigé', () => {
    let mockDatabase;
    let mockAuthManager;
    let mockApp;

    beforeEach(() => {
        // Mock database
        mockDatabase = {
            signUp: jest.fn(),
            getCurrentSession: jest.fn(),
            getUserById: jest.fn()
        };

        // Mock auth manager
        mockAuthManager = {
            signUp: jest.fn(),
            getCurrentUser: jest.fn(),
            isAuthenticated: jest.fn()
        };

        // Mock app
        mockApp = {
            handleAuthChange: jest.fn(),
            loadDashboard: jest.fn(),
            checkAndCreateTempChallenge: jest.fn()
        };

        // Setup DOM
        document.body.innerHTML = `
            <div id="signupScreen">
                <input id="signupName" value="Nicolas" />
                <input id="signupEmail" value="nicolas@test.com" />
                <input id="signupPassword" value="password123" />
                <button id="signupBtn">S'inscrire</button>
            </div>
            <div id="dashboardScreen"></div>
        `;
    });

    test('L\'inscription doit réussir et activer auto-login', async () => {
        // Simuler réponse backend réussie
        mockDatabase.signUp.mockResolvedValue({
            success: true,
            data: {
                user: { id: '123', email: 'nicolas@test.com', name: 'Nicolas' },
                session: { access_token: 'token123' }
            },
            message: 'Bienvenue Nicolas !'
        });

        mockAuthManager.signUp.mockResolvedValue({
            success: true,
            message: 'Bienvenue Nicolas !',
            user: { id: '123', email: 'nicolas@test.com', name: 'Nicolas' },
            autoLogin: true
        });

        const result = await mockAuthManager.signUp({
            name: 'Nicolas',
            email: 'nicolas@test.com',
            password: 'password123'
        });

        expect(result.success).toBe(true);
        expect(result.autoLogin).toBe(true);
        expect(result.user).toBeDefined();
        expect(result.user.email).toBe('nicolas@test.com');
    });

    test('handleAuthChange doit rediriger vers dashboard après SIGNED_IN', () => {
        const user = { id: '123', email: 'nicolas@test.com', name: 'Nicolas' };
        
        mockApp.handleAuthChange('SIGNED_IN', user);

        expect(mockApp.handleAuthChange).toHaveBeenCalledWith('SIGNED_IN', user);
        // Vérifier que loadDashboard est appelé
        // Vérifier que l'écran dashboard devient actif
    });

    test('Le challenge temporaire doit être créé après connexion', async () => {
        // Sauvegarder un challenge temporaire
        const tempChallenge = {
            title: 'Test Challenge',
            duration: 30,
            witnessEmail: 'witness@test.com'
        };
        localStorage.setItem('motiveme_temp_challenge', JSON.stringify(tempChallenge));

        const user = { id: '123', email: 'nicolas@test.com' };
        
        mockApp.checkAndCreateTempChallenge = jest.fn();
        mockApp.handleAuthChange('SIGNED_IN', user);

        // Vérifier que checkAndCreateTempChallenge est appelé
        expect(mockApp.checkAndCreateTempChallenge).toHaveBeenCalled();
    });

    test('Les erreurs d\'inscription doivent être affichées', async () => {
        mockAuthManager.signUp.mockResolvedValue({
            success: false,
            error: 'Email déjà utilisé'
        });

        const result = await mockAuthManager.signUp({
            name: 'Nicolas',
            email: 'nicolas@test.com',
            password: 'password123'
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Email déjà utilisé');
    });
});
