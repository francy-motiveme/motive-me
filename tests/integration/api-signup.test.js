
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
                password: 'Test1234', // 4 caractères minimum
                metadata: { name: 'Integration Test' }
            })
        });

        // Status 201 = création réussie
        expect(response.status).toBe(201);
        expect(response.ok).toBe(true);

        const data = await response.json();
        
        expect(data.success).toBe(true);
        expect(data.data.user.email).toBe(uniqueEmail);
        expect(data.data.session).toBeDefined();
        expect(data.message).toContain('Bienvenue');
    });

    test('POST /auth/signup - rejet email déjà utilisé', async () => {
        const email = `duplicate-${Date.now()}@test.com`;
        
        // Première inscription
        const first = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password: 'Test1234',
                metadata: { name: 'First' }
            })
        });

        expect(first.status).toBe(201); // Première doit réussir

        // Deuxième inscription (devrait échouer)
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password: 'Test1234',
                metadata: { name: 'Second' }
            })
        });

        expect(response.status).toBe(400);
        expect(response.ok).toBe(false);

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
                password: 'Test1234',
                metadata: { name: 'Test' }
            })
        });

        expect(response.status).toBe(400);
        expect(response.ok).toBe(false);

        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('email');
    });
});
