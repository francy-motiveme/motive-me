// Tests unitaires - Module Analytics
import { describe, test, expect, beforeEach } from '@jest/globals';

describe('Analytics Module', () => {
    let analyticsManager;

    beforeEach(() => {
        analyticsManager = require('../../js/modules/analytics.js').default;
    });

    describe('calculateCompletionRate', () => {
        test('devrait calculer le taux de complétion correctement', () => {
            const challenges = [
                { occurrences: [{ checked: true }, { checked: true }, { checked: false }] },
                { occurrences: [{ checked: true }, { checked: true }] }
            ];

            const rate = analyticsManager.calculateCompletionRate(challenges);
            expect(rate).toBe(80); // 4/5 = 80%
        });

        test('devrait retourner 0 pour un tableau vide', () => {
            const rate = analyticsManager.calculateCompletionRate([]);
            expect(rate).toBe(0);
        });

        test('devrait retourner 100 pour tous les checks complétés', () => {
            const challenges = [
                { occurrences: [{ checked: true }, { checked: true }] }
            ];

            const rate = analyticsManager.calculateCompletionRate(challenges);
            expect(rate).toBe(100);
        });
    });

    describe('calculateMaxStreak', () => {
        test('devrait calculer la plus longue série', () => {
            const occurrences = [
                { checked: true, date: '2025-09-25' },
                { checked: true, date: '2025-09-26' },
                { checked: true, date: '2025-09-27' },
                { checked: false, date: '2025-09-28' },
                { checked: true, date: '2025-09-29' }
            ];

            const streak = analyticsManager.calculateMaxStreak(occurrences);
            expect(streak).toBe(3);
        });

        test('devrait retourner 0 sans occurrences', () => {
            const streak = analyticsManager.calculateMaxStreak([]);
            expect(streak).toBe(0);
        });

        test('devrait compter une série de 1', () => {
            const occurrences = [
                { checked: false, date: '2025-09-25' },
                { checked: true, date: '2025-09-26' },
                { checked: false, date: '2025-09-27' }
            ];

            const streak = analyticsManager.calculateMaxStreak(occurrences);
            expect(streak).toBe(1);
        });
    });

    describe('calculatePoints', () => {
        test('devrait calculer les points pour un check-in', () => {
            const points = analyticsManager.calculateCheckInPoints({
                isOnTime: true,
                streak: 5,
                hasProof: true
            });

            expect(points).toBeGreaterThan(10);
        });

        test('devrait donner un bonus pour une série longue', () => {
            const normalPoints = analyticsManager.calculateCheckInPoints({
                isOnTime: true,
                streak: 1,
                hasProof: true
            });

            const bonusPoints = analyticsManager.calculateCheckInPoints({
                isOnTime: true,
                streak: 10,
                hasProof: true
            });

            expect(bonusPoints).toBeGreaterThan(normalPoints);
        });
    });

    describe('getChallengeStats', () => {
        test('devrait calculer toutes les statistiques', () => {
            const challenges = [
                {
                    id: 1,
                    occurrences: [
                        { checked: true, date: '2025-09-25' },
                        { checked: true, date: '2025-09-26' },
                        { checked: false, date: '2025-09-27' }
                    ]
                }
            ];

            const stats = analyticsManager.getChallengeStats(challenges);

            expect(stats).toHaveProperty('totalChallenges');
            expect(stats).toHaveProperty('completionRate');
            expect(stats).toHaveProperty('maxStreak');
            expect(stats).toHaveProperty('totalPoints');
            expect(stats.totalChallenges).toBe(1);
        });
    });

    describe('getWeeklyProgress', () => {
        test('devrait calculer les progrès hebdomadaires', () => {
            const challenge = {
                occurrences: [
                    { checked: true, date: '2025-09-23' },
                    { checked: true, date: '2025-09-24' },
                    { checked: false, date: '2025-09-25' },
                    { checked: true, date: '2025-09-26' },
                    { checked: true, date: '2025-09-27' },
                    { checked: true, date: '2025-09-28' },
                    { checked: false, date: '2025-09-29' }
                ]
            };

            const progress = analyticsManager.getWeeklyProgress(challenge);

            expect(progress).toHaveProperty('daysCompleted');
            expect(progress).toHaveProperty('daysTotal');
            expect(progress).toHaveProperty('percentage');
            expect(progress.daysCompleted).toBe(5);
            expect(progress.daysTotal).toBe(7);
        });
    });

    describe('predictSuccess', () => {
        test('devrait prédire une réussite probable', () => {
            const challenge = {
                occurrences: [
                    { checked: true },
                    { checked: true },
                    { checked: true },
                    { checked: true },
                    { checked: false }
                ],
                duration: 30
            };

            const prediction = analyticsManager.predictSuccess(challenge);
            expect(prediction.probability).toBeGreaterThan(0.5);
        });

        test('devrait prédire un échec probable', () => {
            const challenge = {
                occurrences: [
                    { checked: false },
                    { checked: false },
                    { checked: false },
                    { checked: true },
                    { checked: false }
                ],
                duration: 30
            };

            const prediction = analyticsManager.predictSuccess(challenge);
            expect(prediction.probability).toBeLessThan(0.5);
        });
    });

    describe('generateReport', () => {
        test('devrait générer un rapport complet', () => {
            const challenges = [
                {
                    id: 1,
                    title: 'Fitness',
                    occurrences: [
                        { checked: true, date: '2025-09-25' },
                        { checked: true, date: '2025-09-26' }
                    ]
                }
            ];

            const report = analyticsManager.generateReport(challenges);

            expect(report).toHaveProperty('summary');
            expect(report).toHaveProperty('challenges');
            expect(report).toHaveProperty('recommendations');
            expect(report.summary).toHaveProperty('totalChallenges');
        });
    });
});
