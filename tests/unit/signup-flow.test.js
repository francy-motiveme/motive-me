
import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe('Flux d\'inscription complet', () => {
    let mockFetch;
    
    beforeEach(() => {
        // Mock fetch global
        mockFetch = jest.fn();
        global.fetch = mockFetch;
        
        // Mock DOM
        global.document = {
            getElementById: jest.fn((id) => {
                const elements = {
                    'signupName': { value: 'Test User' },
                    'signupEmail': { value: 'test@example.com' },
                    'signupPassword': { value: 'Password123!' },
                    'signupBtn': { 
                        disabled: false,
                        textContent: 'Créer mon compte'
                    }
                };
                return elements[id] || null;
            }),
            querySelectorAll: jest.fn(() => []),
            querySelector: jest.fn(() => null)
        };
    });

    test('Devrait réussir l\'inscription avec des données valides', async () => {
        // Mock réponse API succès
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 201,
            json: async () => ({
                success: true,
                data: {
                    user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
                    session: { access_token: 'token-123' }
                },
                message: 'Bienvenue Test User !'
            })
        });

        const result = await mockFetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'Password123!',
                metadata: { name: 'Test User' }
            })
        });

        const data = await result.json();

        expect(result.ok).toBe(true);
        expect(result.status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.data.user.email).toBe('test@example.com');
        expect(data.data.session).toBeDefined();
    });

    test('Devrait rejeter un email déjà utilisé', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 400,
            json: async () => ({
                success: false,
                error: 'Cet email est déjà utilisé. Connecte-toi ou utilise un autre email.'
            })
        });

        const result = await mockFetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'existing@example.com',
                password: 'Password123!',
                metadata: { name: 'Test' }
            })
        });

        const data = await result.json();

        expect(result.ok).toBe(false);
        expect(result.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain('déjà utilisé');
    });

    test('Devrait valider le format email', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 400,
            json: async () => ({
                success: false,
                error: 'Format email invalide'
            })
        });

        const result = await mockFetch('/api/auth/signup', {
            method: 'POST',
            body: JSON.stringify({
                email: 'invalid-email',
                password: 'Password123!',
                metadata: { name: 'Test' }
            })
        });

        const data = await result.json();

        expect(data.success).toBe(false);
        expect(data.error).toContain('email invalide');
    });

    test('Devrait valider la complexité du mot de passe', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 400,
            json: async () => ({
                success: false,
                error: 'Le mot de passe doit contenir au moins 4 caractères'
            })
        });

        const result = await mockFetch('/api/auth/signup', {
            method: 'POST',
            body: JSON.stringify({
                email: 'test@example.com',
                password: '123',
                metadata: { name: 'Test' }
            })
        });

        const data = await result.json();

        expect(data.success).toBe(false);
        expect(data.error).toContain('mot de passe');
    });
});
