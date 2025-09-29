
// Tests unitaires complets - Module Database
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import database from '../../js/modules/database.js';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        auth: {
            signUp: jest.fn(),
            signInWithPassword: jest.fn(),
            signOut: jest.fn(),
            getSession: jest.fn(),
            onAuthStateChange: jest.fn()
        },
        from: jest.fn(() => ({
            insert: jest.fn(() => ({ select: () => ({ single: jest.fn() }) })),
            select: jest.fn(() => ({ 
                eq: () => ({ single: jest.fn() }),
                order: () => jest.fn(),
                limit: jest.fn()
            })),
            update: jest.fn(() => ({ 
                eq: () => ({ select: () => ({ single: jest.fn() }) })
            })),
            delete: jest.fn(() => ({ eq: jest.fn() }))
        })),
        storage: {
            from: jest.fn(() => ({
                upload: jest.fn(),
                remove: jest.fn(),
                getPublicUrl: jest.fn()
            })),
            listBuckets: jest.fn()
        },
        channel: jest.fn(() => ({
            on: jest.fn(() => ({ subscribe: jest.fn() })),
            unsubscribe: jest.fn()
        }))
    }))
}));

describe('Database Module - Tests Complets', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Authentification', () => {
        test('signUp devrait créer un compte utilisateur', async () => {
            const mockSignUp = database.client.auth.signUp;
            mockSignUp.mockResolvedValue({
                data: { user: { id: 'user-123', email: 'test@example.com' } },
                error: null
            });

            const result = await database.signUp('test@example.com', 'password123', {
                name: 'Test User'
            });

            expect(result.success).toBe(true);
            expect(mockSignUp).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'password123',
                options: { data: { name: 'Test User' } }
            });
        });

        test('signIn devrait connecter un utilisateur', async () => {
            const mockSignIn = database.client.auth.signInWithPassword;
            mockSignIn.mockResolvedValue({
                data: { user: { id: 'user-123' }, session: { access_token: 'token' } },
                error: null
            });

            const result = await database.signIn('test@example.com', 'password123');

            expect(result.success).toBe(true);
            expect(mockSignIn).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'password123'
            });
        });

        test('signOut devrait déconnecter un utilisateur', async () => {
            const mockSignOut = database.client.auth.signOut;
            mockSignOut.mockResolvedValue({ error: null });

            const result = await database.signOut();

            expect(result.success).toBe(true);
            expect(mockSignOut).toHaveBeenCalled();
        });

        test('getCurrentSession devrait retourner la session courante', async () => {
            const mockGetSession = database.client.auth.getSession;
            mockGetSession.mockResolvedValue({
                data: { session: { user: { id: 'user-123' } } },
                error: null
            });

            const result = await database.getCurrentSession();

            expect(result.success).toBe(true);
            expect(result.session).toBeDefined();
        });
    });

    describe('Gestion Utilisateurs', () => {
        test('createUser devrait créer un profil utilisateur', async () => {
            const mockInsert = jest.fn().mockReturnValue({
                select: () => ({
                    single: jest.fn().mockResolvedValue({
                        data: { id: 'user-123', name: 'Test User' },
                        error: null
                    })
                })
            });
            database.client.from.mockReturnValue({ insert: mockInsert });

            const userData = {
                id: 'user-123',
                name: 'Test User',
                email: 'test@example.com'
            };

            const result = await database.createUser(userData);

            expect(result.success).toBe(true);
            expect(database.client.from).toHaveBeenCalledWith('users');
            expect(mockInsert).toHaveBeenCalledWith([userData]);
        });

        test('getUserById devrait récupérer un utilisateur', async () => {
            const mockSelect = jest.fn().mockReturnValue({
                eq: () => ({
                    single: jest.fn().mockResolvedValue({
                        data: { id: 'user-123', name: 'Test User' },
                        error: null
                    })
                })
            });
            database.client.from.mockReturnValue({ select: mockSelect });

            const result = await database.getUserById('user-123');

            expect(result.success).toBe(true);
            expect(result.data.id).toBe('user-123');
        });

        test('updateUser devrait mettre à jour un utilisateur', async () => {
            const mockUpdate = jest.fn().mockReturnValue({
                eq: () => ({
                    select: () => ({
                        single: jest.fn().mockResolvedValue({
                            data: { id: 'user-123', points: 100 },
                            error: null
                        })
                    })
                })
            });
            database.client.from.mockReturnValue({ update: mockUpdate });

            const result = await database.updateUser('user-123', { points: 100 });

            expect(result.success).toBe(true);
            expect(mockUpdate).toHaveBeenCalledWith({ points: 100 });
        });
    });

    describe('Gestion Challenges', () => {
        test('createChallenge devrait créer un nouveau défi', async () => {
            const mockInsert = jest.fn().mockReturnValue({
                select: () => ({
                    single: jest.fn().mockResolvedValue({
                        data: { id: 1, title: 'Test Challenge' },
                        error: null
                    })
                })
            });
            database.client.from.mockReturnValue({ insert: mockInsert });

            const challengeData = {
                user_id: 'user-123',
                title: 'Test Challenge',
                duration: 30
            };

            const result = await database.createChallenge(challengeData);

            expect(result.success).toBe(true);
            expect(database.client.from).toHaveBeenCalledWith('challenges');
        });

        test('getChallengesByUser devrait récupérer les défis d\'un utilisateur', async () => {
            const mockSelect = jest.fn().mockReturnValue({
                eq: () => ({
                    order: jest.fn().mockResolvedValue({
                        data: [{ id: 1, title: 'Challenge 1' }],
                        error: null
                    })
                })
            });
            database.client.from.mockReturnValue({ select: mockSelect });

            const result = await database.getChallengesByUser('user-123');

            expect(result.success).toBe(true);
            expect(Array.isArray(result.data)).toBe(true);
        });

        test('updateChallenge devrait mettre à jour un défi', async () => {
            const mockUpdate = jest.fn().mockReturnValue({
                eq: () => ({
                    select: () => ({
                        single: jest.fn().mockResolvedValue({
                            data: { id: 1, status: 'completed' },
                            error: null
                        })
                    })
                })
            });
            database.client.from.mockReturnValue({ update: mockUpdate });

            const result = await database.updateChallenge(1, { status: 'completed' });

            expect(result.success).toBe(true);
        });

        test('deleteChallenge devrait supprimer un défi', async () => {
            const mockDelete = jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null })
            });
            database.client.from.mockReturnValue({ delete: mockDelete });

            const result = await database.deleteChallenge(1);

            expect(result.success).toBe(true);
        });
    });

    describe('Check-ins', () => {
        test('createCheckIn devrait enregistrer un check-in', async () => {
            const mockInsert = jest.fn().mockReturnValue({
                select: () => ({
                    single: jest.fn().mockResolvedValue({
                        data: { id: 1, challenge_id: 1 },
                        error: null
                    })
                })
            });
            database.client.from.mockReturnValue({ insert: mockInsert });

            const checkInData = {
                user_id: 'user-123',
                challenge_id: 1,
                occurrence_id: 1
            };

            const result = await database.createCheckIn(checkInData);

            expect(result.success).toBe(true);
            expect(database.client.from).toHaveBeenCalledWith('checkins');
        });

        test('getCheckInsByChallenge devrait récupérer les check-ins', async () => {
            const mockSelect = jest.fn().mockReturnValue({
                eq: () => ({
                    order: jest.fn().mockResolvedValue({
                        data: [{ id: 1, checked_at: new Date() }],
                        error: null
                    })
                })
            });
            database.client.from.mockReturnValue({ select: mockSelect });

            const result = await database.getCheckInsByChallenge(1);

            expect(result.success).toBe(true);
            expect(Array.isArray(result.data)).toBe(true);
        });
    });

    describe('Notifications', () => {
        test('createNotification devrait créer une notification', async () => {
            const mockInsert = jest.fn().mockReturnValue({
                select: () => ({
                    single: jest.fn().mockResolvedValue({
                        data: { id: 1, title: 'Test Notification' },
                        error: null
                    })
                })
            });
            database.client.from.mockReturnValue({ insert: mockInsert });

            const notificationData = {
                user_id: 'user-123',
                type: 'info',
                title: 'Test Notification',
                message: 'Test message'
            };

            const result = await database.createNotification(notificationData);

            expect(result.success).toBe(true);
        });

        test('getNotificationsByUser devrait récupérer les notifications', async () => {
            const mockSelect = jest.fn().mockReturnValue({
                eq: () => ({
                    order: () => ({
                        limit: jest.fn().mockResolvedValue({
                            data: [{ id: 1, title: 'Notification 1' }],
                            error: null
                        })
                    })
                })
            });
            database.client.from.mockReturnValue({ select: mockSelect });

            const result = await database.getNotificationsByUser('user-123');

            expect(result.success).toBe(true);
            expect(Array.isArray(result.data)).toBe(true);
        });

        test('markNotificationAsRead devrait marquer comme lue', async () => {
            const mockUpdate = jest.fn().mockReturnValue({
                eq: () => ({
                    select: () => ({
                        single: jest.fn().mockResolvedValue({
                            data: { id: 1, read: true },
                            error: null
                        })
                    })
                })
            });
            database.client.from.mockReturnValue({ update: mockUpdate });

            const result = await database.markNotificationAsRead(1);

            expect(result.success).toBe(true);
        });
    });

    describe('Storage', () => {
        test('uploadFile devrait uploader un fichier', async () => {
            const mockUpload = jest.fn().mockResolvedValue({
                data: { path: 'test/file.jpg' },
                error: null
            });
            database.client.storage.from.mockReturnValue({ upload: mockUpload });

            const file = new Blob(['test'], { type: 'image/jpeg' });
            const result = await database.uploadFile('bucket', 'test/file.jpg', file);

            expect(result.success).toBe(true);
        });

        test('deleteFile devrait supprimer un fichier', async () => {
            const mockRemove = jest.fn().mockResolvedValue({
                data: null,
                error: null
            });
            database.client.storage.from.mockReturnValue({ remove: mockRemove });

            const result = await database.deleteFile('bucket', 'test/file.jpg');

            expect(result.success).toBe(true);
        });

        test('getPublicUrl devrait retourner une URL publique', () => {
            const mockGetPublicUrl = jest.fn().mockReturnValue({
                data: { publicUrl: 'https://example.com/file.jpg' }
            });
            database.client.storage.from.mockReturnValue({ getPublicUrl: mockGetPublicUrl });

            const result = database.getPublicUrl('bucket', 'test/file.jpg');

            expect(result.success).toBe(true);
            expect(result.url).toBe('https://example.com/file.jpg');
        });
    });

    describe('Real-time', () => {
        test('subscribeToTable devrait créer une subscription', () => {
            const mockSubscribe = jest.fn();
            const mockOn = jest.fn().mockReturnValue({ subscribe: mockSubscribe });
            const mockChannel = jest.fn().mockReturnValue({ on: mockOn });
            database.client.channel = mockChannel;

            const callback = jest.fn();
            const subscription = database.subscribeToTable('users', callback);

            expect(mockChannel).toHaveBeenCalledWith('users_changes');
            expect(mockOn).toHaveBeenCalled();
            expect(mockSubscribe).toHaveBeenCalled();
        });

        test('unsubscribe devrait annuler une subscription', () => {
            const mockUnsubscribe = jest.fn();
            const subscription = { unsubscribe: mockUnsubscribe };

            const result = database.unsubscribe(subscription);

            expect(result.success).toBe(true);
            expect(mockUnsubscribe).toHaveBeenCalled();
        });
    });

    describe('Gestion d\'erreurs', () => {
        test('devrait gérer les erreurs d\'authentification', async () => {
            const mockSignIn = database.client.auth.signInWithPassword;
            mockSignIn.mockResolvedValue({
                data: null,
                error: { message: 'Invalid credentials' }
            });

            const result = await database.signIn('wrong@email.com', 'wrongpass');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid credentials');
        });

        test('devrait gérer les erreurs de base de données', async () => {
            const mockInsert = jest.fn().mockReturnValue({
                select: () => ({
                    single: jest.fn().mockResolvedValue({
                        data: null,
                        error: { message: 'Database error' }
                    })
                })
            });
            database.client.from.mockReturnValue({ insert: mockInsert });

            const result = await database.createUser({});

            expect(result.success).toBe(false);
            expect(result.error).toBe('Database error');
        });
    });
});
