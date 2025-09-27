// Tests unitaires - Système de badges
import { describe, test, expect, beforeEach } from '@jest/globals';
import { BadgeManager } from '../../js/modules/badges.js';

describe('BadgeManager', () => {
    let badgeManager;

    beforeEach(() => {
        badgeManager = new BadgeManager();
    });

    describe('Initialisation des badges', () => {
        test('devrait initialiser tous les badges disponibles', () => {
            const badges = badgeManager.availableBadges;

            expect(badges).toBeDefined();
            expect(badges.first_challenge).toBeDefined();
            expect(badges.first_checkin).toBeDefined();
            expect(badges.week_streak).toBeDefined();
        });

        test('devrait avoir les badges avancés du PROMPT_EXPERT_FINALIZATION', () => {
            const badges = badgeManager.availableBadges;

            expect(badges.first_witness).toBeDefined();
            expect(badges.first_witness.name).toBe('Témoin Fidèle');
            expect(badges.first_witness.icon).toBe('👁️');
            expect(badges.first_witness.points).toBe(100);
        });
    });

    describe('Vérification des conditions de badges', () => {
        test('devrait accorder le badge "Premier Pas" au premier challenge', () => {
            const user = { id: 'user-123' };
            const stats = { challenges_created: 1 };

            const condition = badgeManager.availableBadges.first_challenge.condition;
            const shouldAward = condition(user, stats);

            expect(shouldAward).toBe(true);
        });

        test('devrait accorder le badge "Marathonien" pour 30 jours de streak', () => {
            const user = { id: 'user-123' };
            const stats = { longest_streak: 30 };

            const condition = badgeManager.availableBadges.month_streak.condition;
            const shouldAward = condition(user, stats);

            expect(shouldAward).toBe(true);
        });

        test('devrait accorder le badge "Légende" pour 100 jours de streak', () => {
            const user = { id: 'user-123' };
            const stats = { longest_streak: 100 };

            const condition = badgeManager.availableBadges.legend_streak.condition;
            const shouldAward = condition(user, stats);

            expect(shouldAward).toBe(true);
            expect(badgeManager.availableBadges.legend_streak.points).toBe(2000);
        });
    });

    describe('Système de niveaux', () => {
        test('devrait calculer le niveau utilisateur correct', () => {
            const testCases = [
                { points: 0, expectedLevel: 1 },
                { points: 500, expectedLevel: 2 },
                { points: 1500, expectedLevel: 3 },
                { points: 3000, expectedLevel: 4 },
                { points: 7000, expectedLevel: 5 }
            ];

            testCases.forEach(({ points, expectedLevel }) => {
                const level = badgeManager.calculateUserLevel(points);
                expect(level.level).toBe(expectedLevel);
            });
        });
    });

    describe('Attribution des badges', () => {
        test('devrait attribuer plusieurs badges simultanément', async () => {
            const user = { 
                id: 'user-123',
                points: 1000 
            };
            const stats = { 
                challenges_created: 1,
                total_checkins: 1,
                longest_streak: 7
            };

            const earnedBadges = await badgeManager.checkAndAwardBadges(user, stats);

            expect(earnedBadges).toContain('first_challenge');
            expect(earnedBadges).toContain('first_checkin');
            expect(earnedBadges).toContain('week_streak');
        });

        test('ne devrait pas attribuer le même badge deux fois', async () => {
            const user = { 
                id: 'user-123',
                badges: ['first_challenge'] // Badge déjà obtenu
            };
            const stats = { 
                challenges_created: 1
            };

            const earnedBadges = await badgeManager.checkAndAwardBadges(user, stats);

            expect(earnedBadges).not.toContain('first_challenge');
        });
    });

    describe('Badges rares et légendaires', () => {
        test('devrait identifier les badges rares', () => {
            const rareBadges = badgeManager.getRareBadges();

            expect(rareBadges).toContain('silver_level');
            expect(rareBadges).toContain('mentor');
        });

        test('devrait identifier les badges légendaires', () => {
            const legendaryBadges = badgeManager.getLegendaryBadges();

            expect(legendaryBadges).toContain('legend_streak');
        });
    });
});