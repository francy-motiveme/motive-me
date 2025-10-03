import { jest } from '@jest/globals';

// Mock fetch pour simuler les appels API Express
global.fetch = jest.fn();

const { Database } = await import('../../js/modules/database.js');

describe('Database Module - Express API', () => {
    let database;

    beforeEach(() => {
        database = new Database();
        jest.clearAllMocks();
        
        // Mock successful API responses by default
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ 
                success: true, 
                data: { id: 'test-id', email: 'test@example.com' } 
            }),
        });
    });

    test('should initialize properly', () => {
        expect(database).toBeInstanceOf(Database);
        expect(database.client).toBeDefined();
        expect(database.client.connected).toBe(true);
    });

    test('should handle API calls successfully', async () => {
        const result = await database._fetch('/test');
        expect(result.success).toBe(true);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/test'),
            expect.objectContaining({
                credentials: 'include'
            })
        );
    });

    test('should handle API errors gracefully', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'Server error' }),
        });

        const result = await database._fetch('/test');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Server error');
    });

    test('should handle signup successfully', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ 
                success: true, 
                data: {
                    user: { id: 'user-123', email: 'test@example.com' },
                    session: { access_token: 'token-123' }
                }
            }),
        });

        const result = await database.signUp('test@example.com', 'Password123!', {
            name: 'Test User'
        });
        
        expect(result.success).toBe(true);
        expect(result.data.user.email).toBe('test@example.com');
    });

    test('should handle signin successfully', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ 
                success: true, 
                data: {
                    user: { id: 'user-123', email: 'test@example.com' },
                    session: { access_token: 'token-123' }
                }
            }),
        });

        const result = await database.signIn('test@example.com', 'Password123!');
        
        expect(result.success).toBe(true);
        expect(result.data.user.email).toBe('test@example.com');
    });

    test('should handle signout successfully', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ success: true }),
        });

        const result = await database.signOut();
        
        expect(result.success).toBe(true);
        expect(database.currentSession).toBeNull();
    });

    test('should get current session', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ 
                success: true,
                data: {
                    session: { access_token: 'token-123' },
                    user: { id: 'user-123', email: 'test@example.com' }
                }
            }),
        });

        const result = await database.getCurrentSession();
        
        expect(result.success).toBe(true);
        expect(result.session).toBeDefined();
    });

    test('should create challenge', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ 
                success: true, 
                data: {
                    id: 'challenge-123',
                    title: 'Test Challenge',
                    user_id: 'user-123'
                }
            }),
        });

        const challengeData = {
            user_id: 'user-123',
            title: 'Test Challenge',
            duration: 30,
            frequency: 'daily'
        };

        const result = await database.createChallenge(challengeData);
        
        expect(result.success).toBe(true);
        expect(result.data.title).toBe('Test Challenge');
    });

    test('should handle network errors', async () => {
        global.fetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await database._fetch('/test');
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Network error');
    });
});
