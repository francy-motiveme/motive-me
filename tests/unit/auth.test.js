// Tests unitaires - Module d'authentification
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { AuthManager } from '../../js/modules/auth.js';
import database from '../../js/modules/database.js';

// Mock du module database
jest.mock('../../js/modules/database.js');

describe('AuthManager', () => {
    let authManager;

    beforeEach(() => {
        authManager = new AuthManager();
        jest.clearAllMocks();
    });

    describe('Inscription', () => {
        test('devrait valider correctement un formulaire d\'inscription valide', async () => {
            const formData = {
                email: 'test@example.com',
                password: 'Password123!',
                name: 'Test User'
            };

            database.signUp.mockResolvedValue({
                success: true,
                data: { user: { id: '123', email: 'test@example.com' } }
            });

            database.createUserProfile.mockResolvedValue({
                success: true,
                data: { id: '123' }
            });

            const result = await authManager.signUp(formData);

            expect(result.success).toBe(true);
            expect(database.signUp).toHaveBeenCalledWith(
                'test@example.com',
                'Password123!',
                expect.any(Object)
            );
        });

        test('devrait rejeter un email invalide', async () => {
            const formData = {
                email: 'email-invalide',
                password: 'Password123!',
                name: 'Test User'
            };

            const result = await authManager.signUp(formData);

            expect(result.success).toBe(false);
            expect(result.error).toContain('email');
        });

        test('devrait rejeter un mot de passe faible', async () => {
            const formData = {
                email: 'test@example.com',
                password: '123',
                name: 'Test User'
            };

            const result = await authManager.signUp(formData);

            expect(result.success).toBe(false);
            expect(result.error).toContain('mot de passe');
        });
    });

    describe('Connexion', () => {
        test('devrait connecter un utilisateur avec des identifiants valides', async () => {
            const credentials = {
                email: 'test@example.com',
                password: 'Password123!'
            };

            database.signIn.mockResolvedValue({
                success: true,
                data: { user: { id: '123', email: 'test@example.com' } }
            });

            database.getUserProfile.mockResolvedValue({
                success: true,
                data: { id: '123', name: 'Test User' }
            });

            const result = await authManager.signIn(credentials);

            expect(result.success).toBe(true);
            expect(database.signIn).toHaveBeenCalledWith(
                'test@example.com',
                'Password123!'
            );
        });

        test('devrait rejeter des identifiants incorrects', async () => {
            const credentials = {
                email: 'test@example.com',
                password: 'wrong-password'
            };

            database.signIn.mockResolvedValue({
                success: false,
                error: 'Invalid credentials'
            });

            const result = await authManager.signIn(credentials);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid credentials');
        });
    });

    describe('Rate Limiting', () => {
        test('devrait appliquer le rate limiting sur les tentatives de connexion', async () => {
            const credentials = {
                email: 'test@example.com',
                password: 'wrong-password'
            };

            database.signIn.mockResolvedValue({
                success: false,
                error: 'Invalid credentials'
            });

            // Simuler plusieurs tentatives échouées
            for (let i = 0; i < 6; i++) {
                await authManager.signIn(credentials);
            }

            const result = await authManager.signIn(credentials);
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Trop de tentatives');
        });
    });

    describe('Session Management', () => {
        test('devrait déconnecter un utilisateur correctement', async () => {
            authManager.currentUser = { id: '123', email: 'test@example.com' };

            database.signOut.mockResolvedValue({
                success: true
            });

            const result = await authManager.signOut();

            expect(result.success).toBe(true);
            expect(authManager.currentUser).toBeNull();
            expect(database.signOut).toHaveBeenCalled();
        });

        test('devrait vérifier l\'état de la session', () => {
            authManager.currentUser = { id: '123', email: 'test@example.com' };

            expect(authManager.isAuthenticated()).toBe(true);

            authManager.currentUser = null;

            expect(authManager.isAuthenticated()).toBe(false);
        });
    });
});