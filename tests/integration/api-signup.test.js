
import { describe, test, expect } from '@jest/globals';

const API_URL = 'http://localhost:3000/api';

describe('API Signup - Tests d\'intégration', () => {
    test('POST /auth/signup - succès avec données valides', async () => {
        const uniqueEmail = `test-${Date.now()}@example.com`;
        
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                email: uniqueEmail,
                password: 'Password123!',
                metadata: { name: 'Integration Test' }
            })
        });

        expect(response.ok).toBe(true);
        expect(response.status).toBe(201);

        const data = await response.json();
        
        expect(data.success).toBe(true);
        expect(data.data.user.email).toBe(uniqueEmail);
        expect(data.data.session).toBeDefined();
        expect(data.message).toContain('Bienvenue');
    });

    test('POST /auth/signup - rejet email déjà utilisé', async () => {
        const email = 'duplicate@test.com';
        
        // Première inscription
        await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password: 'Password123!',
                metadata: { name: 'First' }
            })
        });

        // Deuxième inscription (devrait échouer)
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password: 'Password123!',
                metadata: { name: 'Second' }
            })
        });

        expect(response.ok).toBe(false);
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('déjà utilisé');
    });

    test('POST /auth/signup - validation email invalide', async () => {
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'invalid-email',
                password: 'Password123!',
                metadata: { name: 'Test' }
            })
        });

        expect(response.ok).toBe(false);
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error).toContain('email');
    });
});
