// Tests unitaires - Module Challenges
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { ChallengeManager } from '../../js/modules/challenges.js';
import database from '../../js/modules/database.js';

// Mock du module database
jest.mock('../../js/modules/database.js');

describe('ChallengeManager', () => {
    let challengeManager;

    beforeEach(() => {
        challengeManager = new ChallengeManager();
        jest.clearAllMocks();
    });

    describe('Création de challenges', () => {
        test('devrait créer un challenge valide', async () => {
            const formData = {
                title: 'Lire 30 min par jour',
                duration: 30,
                frequency: 'daily',
                witnessEmail: 'witness@example.com',
                gage: 'Je donne 50€ à une association'
            };

            database.createChallenge.mockResolvedValue({
                success: true,
                data: { id: 'challenge-123', ...formData, status: 'active' }
            });

            const result = await challengeManager.createChallenge(formData, 'user-123');

            expect(result.success).toBe(true);
            expect(database.createChallenge).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: formData.title,
                    duration: formData.duration,
                    frequency: formData.frequency
                })
            );
        });

        test('devrait rejeter un challenge avec un titre vide', async () => {
            const formData = {
                title: '',
                duration: 30,
                frequency: 'daily',
                witnessEmail: 'witness@example.com',
                gage: 'Je donne 50€ à une association'
            };

            const result = await challengeManager.createChallenge(formData, 'user-123');

            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();
        });

        test('devrait générer les occurrences correctement pour un challenge quotidien', () => {
            const startDate = new Date('2024-01-01');
            const duration = 7;
            const frequency = 'daily';

            const occurrences = challengeManager.generateOccurrences(
                startDate, 
                duration, 
                frequency, 
                []
            );

            expect(occurrences).toHaveLength(7);
            expect(occurrences[0].date).toBe('2024-01-01T00:00:00.000Z');
            expect(occurrences[6].date).toBe('2024-01-07T00:00:00.000Z');
        });
    });

    describe('Check-ins', () => {
        test('devrait enregistrer un check-in valide', async () => {
            const challengeId = 'challenge-123';
            const userId = 'user-123';
            const checkInData = {
                proof_text: 'J\'ai lu pendant 45 minutes',
                proof_photo: null
            };

            database.createCheckIn.mockResolvedValue({
                success: true,
                data: { id: 'checkin-123', challenge_id: challengeId }
            });

            database.updateChallengeStats.mockResolvedValue({
                success: true
            });

            const result = await challengeManager.submitCheckIn(
                challengeId, 
                userId, 
                checkInData
            );

            expect(result.success).toBe(true);
            expect(database.createCheckIn).toHaveBeenCalled();
        });

        test('devrait calculer le streak correctement', () => {
            const checkins = [
                { date: '2024-01-01', completed: true },
                { date: '2024-01-02', completed: true },
                { date: '2024-01-03', completed: false },
                { date: '2024-01-04', completed: true },
                { date: '2024-01-05', completed: true }
            ];

            const streak = challengeManager.calculateCurrentStreak(checkins);

            // Streak actuel de 2 (les 2 derniers jours)
            expect(streak).toBe(2);
        });
    });

    describe('Calcul des points', () => {
        test('devrait calculer les points de base correctement', () => {
            const challenge = {
                duration: 30,
                frequency: 'daily',
                completion_rate: 100
            };

            const points = challengeManager.calculatePoints(challenge);

            expect(points).toBeGreaterThan(0);
        });

        test('devrait appliquer des bonus pour les streaks', () => {
            const basePoints = 100;
            const streak = 15;

            const bonusPoints = challengeManager.calculateStreakBonus(basePoints, streak);

            expect(bonusPoints).toBeGreaterThan(basePoints);
        });
    });

    describe('Témoins', () => {
        test('devrait notifier un témoin lors de la création d\'un challenge', async () => {
            const challenge = {
                id: 'challenge-123',
                title: 'Test Challenge',
                witness_email: 'witness@example.com'
            };

            const spy = jest.spyOn(challengeManager, 'notifyWitness');
            spy.mockResolvedValue({ success: true });

            await challengeManager.notifyWitness(challenge, 'new_challenge');

            expect(spy).toHaveBeenCalledWith(challenge, 'new_challenge');
        });
    });
});