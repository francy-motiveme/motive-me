
import { jest } from '@jest/globals';

// Mock Supabase
const mockSupabase = {
    from: jest.fn(() => ({
        select: jest.fn(() => ({ 
            limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        insert: jest.fn(() => Promise.resolve({ data: {}, error: null })),
        update: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ data: {}, error: null }))
        }))
    })),
    auth: {
        getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null }))
    }
};

jest.unstable_mockModule('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => mockSupabase)
}));

const { Database } = await import('../../js/modules/database.js');

describe('Database Module', () => {
    let database;

    beforeEach(() => {
        database = new Database();
        jest.clearAllMocks();
    });

    test('should initialize properly', () => {
        expect(database).toBeInstanceOf(Database);
        expect(database.isConnected).toBe(false);
        expect(database.retryCount).toBe(0);
    });

    test('should connect successfully', async () => {
        const result = await database.connect();
        expect(result.success).toBe(true);
        expect(database.isConnected).toBe(true);
    });

    test('should handle connection failure gracefully', async () => {
        // Mock a connection failure
        mockSupabase.from.mockImplementationOnce(() => {
            throw new Error('Connection failed');
        });

        const result = await database.connect();
        expect(result.success).toBe(true); // Should activate fallback mode
        expect(result.fallback).toBe(true);
    });

    test('should create user successfully', async () => {
        await database.connect();
        
        const userData = {
            id: 'test-id',
            email: 'test@example.com',
            name: 'Test User'
        };

        const result = await database.createUser(userData);
        expect(result.success).toBe(true);
    });

    test('should handle user creation failure', async () => {
        await database.connect();
        
        // Mock insert failure
        mockSupabase.from().insert.mockResolvedValueOnce({
            data: null,
            error: { message: 'Insert failed' }
        });

        const result = await database.createUser({});
        expect(result.success).toBe(false);
        expect(result.error).toContain('Insert failed');
    });
});
