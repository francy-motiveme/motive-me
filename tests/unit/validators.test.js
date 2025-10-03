// Tests unitaires - Module de validation
import { describe, test, expect } from '@jest/globals';
import { Validators } from '../../js/modules/validators.js';

describe('Validators Module', () => {
    describe('validateEmail', () => {
        test('devrait accepter un email valide', () => {
            const result = Validators.validateEmail('test@example.com');
            expect(result.valid).toBe(true);
            expect(result.message).toBe('');
        });

        test('devrait rejeter un email sans @', () => {
            const result = Validators.validateEmail('testexample.com');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('valide');
        });

        test('devrait rejeter un email sans domaine', () => {
            const result = Validators.validateEmail('test@');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('valide');
        });

        test('devrait rejeter un email vide', () => {
            const result = Validators.validateEmail('');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('requis');
        });

        test('devrait accepter des emails complexes', () => {
            const emails = [
                'user.name@example.com',
                'user+tag@example.co.uk',
                'user_name@sub.example.com'
            ];

            emails.forEach(email => {
                const result = Validators.validateEmail(email);
                expect(result.valid).toBe(true);
            });
        });
    });

    describe('validatePassword', () => {
        test('devrait accepter un mot de passe de 6 caractères', () => {
            const result = Validators.validatePassword('abc123');
            expect(result.valid).toBe(true);
        });

        test('devrait accepter un mot de passe simple', () => {
            const result = Validators.validatePassword('simple');
            expect(result.valid).toBe(true);
        });

        test('devrait accepter un mot de passe avec seulement des chiffres', () => {
            const result = Validators.validatePassword('123456');
            expect(result.valid).toBe(true);
        });

        test('devrait accepter un mot de passe fort', () => {
            const result = Validators.validatePassword('StrongPass123!');
            expect(result.valid).toBe(true);
        });

        test('devrait rejeter un mot de passe trop court', () => {
            const result = Validators.validatePassword('abc12');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('6 caractères');
        });

        test('devrait rejeter un mot de passe trop long', () => {
            const longPassword = 'a'.repeat(129);
            const result = Validators.validatePassword(longPassword);
            expect(result.valid).toBe(false);
            expect(result.message).toContain('128 caractères');
        });

        test('devrait rejeter un mot de passe vide', () => {
            const result = Validators.validatePassword('');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('requis');
        });
    });

    describe('validateChallengeTitle', () => {
        test('devrait accepter un titre valide', () => {
            const result = Validators.validateChallengeTitle('Mon défi fitness');
            expect(result.valid).toBe(true);
            expect(result.message).toBe('');
        });

        test('devrait rejeter un titre trop court', () => {
            const result = Validators.validateChallengeTitle('AB');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('3 caractères');
        });

        test('devrait rejeter un titre trop long', () => {
            const longTitle = 'A'.repeat(101);
            const result = Validators.validateChallengeTitle(longTitle);
            expect(result.valid).toBe(false);
            expect(result.message).toContain('100 caractères');
        });

        test('devrait rejeter un titre vide', () => {
            const result = Validators.validateChallengeTitle('');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('requis');
        });

        test('devrait rejeter un titre avec uniquement des espaces', () => {
            const result = Validators.validateChallengeTitle('   ');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('requis');
        });
    });

    describe('validateChallengeDuration', () => {
        test('devrait accepter une durée valide', () => {
            const durations = [7, 14, 21, 30, 60, 90];
            
            durations.forEach(duration => {
                const result = Validators.validateChallengeDuration(duration);
                expect(result.valid).toBe(true);
            });
        });

        test('devrait rejeter une durée trop courte', () => {
            const result = Validators.validateChallengeDuration(3);
            expect(result.valid).toBe(false);
            expect(result.message).toContain('7 jours');
        });

        test('devrait rejeter une durée trop longue', () => {
            const result = Validators.validateChallengeDuration(400);
            expect(result.valid).toBe(false);
            expect(result.message).toContain('365 jours');
        });

        test('devrait rejeter une durée non numérique', () => {
            const result = Validators.validateChallengeDuration('invalid');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('valide');
        });

        test('devrait rejeter une durée vide', () => {
            const result = Validators.validateChallengeDuration('');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('requis');
        });
    });

    describe('validateWitnessEmail', () => {
        test('devrait accepter un email de témoin valide', () => {
            const result = Validators.validateWitnessEmail('witness@example.com');
            expect(result.valid).toBe(true);
            expect(result.message).toBe('');
        });

        test('devrait rejeter un email de témoin invalide', () => {
            const result = Validators.validateWitnessEmail('invalid-email');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('valide');
        });

        test('devrait rejeter un email de témoin vide', () => {
            const result = Validators.validateWitnessEmail('');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('requis');
        });
    });

    describe('validateCheckinProof', () => {
        test('devrait accepter une preuve valide', () => {
            const result = Validators.validateCheckinProof('J\'ai terminé mon entraînement ce matin');
            expect(result.valid).toBe(true);
            expect(result.message).toBe('');
        });

        test('devrait rejeter une preuve trop courte', () => {
            const result = Validators.validateCheckinProof('Ok');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('5 caractères');
        });

        test('devrait rejeter une preuve trop longue', () => {
            const longProof = 'A'.repeat(1001);
            const result = Validators.validateCheckinProof(longProof);
            expect(result.valid).toBe(false);
            expect(result.message).toContain('1000 caractères');
        });

        test('devrait rejeter une preuve vide', () => {
            const result = Validators.validateCheckinProof('');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('requis');
        });
    });

    describe('validateChallengeForm', () => {
        test('devrait valider un formulaire complet et valide', () => {
            const formData = {
                title: 'Mon défi fitness',
                duration: 30,
                frequency: 'daily',
                witnessEmail: 'witness@example.com',
                gage: 'Faire 50 pompes'
            };

            const result = Validators.validateChallengeForm(formData);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('devrait détecter plusieurs erreurs dans un formulaire', () => {
            const formData = {
                title: 'AB',
                duration: 3,
                frequency: 'daily',
                witnessEmail: 'invalid-email',
                gage: 'XY'
            };

            const result = Validators.validateChallengeForm(formData);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(2);
        });

        test('devrait valider les jours personnalisés pour la fréquence custom', () => {
            const formData = {
                title: 'Mon défi',
                duration: 30,
                frequency: 'custom',
                customDays: [1, 3, 5],
                witnessEmail: 'witness@example.com',
                gage: 'Gage valide'
            };

            const result = Validators.validateChallengeForm(formData);
            expect(result.valid).toBe(true);
        });

        test('devrait rejeter une fréquence custom sans jours sélectionnés', () => {
            const formData = {
                title: 'Mon défi',
                duration: 30,
                frequency: 'custom',
                customDays: [],
                witnessEmail: 'witness@example.com',
                gage: 'Gage valide'
            };

            const result = Validators.validateChallengeForm(formData);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('jours'))).toBe(true);
        });
    });

    describe('Sanitization', () => {
        test('devrait nettoyer les entrées utilisateur', () => {
            const input = '  <script>alert("XSS")</script>  ';
            const sanitized = Validators.sanitizeInput(input);
            
            expect(sanitized).not.toContain('<script>');
            expect(sanitized.trim()).toBe(sanitized);
        });

        test('devrait échapper les caractères HTML dangereux', () => {
            const input = '<div>Test & "quotes"</div>';
            const escaped = Validators.escapeHtml(input);
            
            expect(escaped).not.toContain('<div>');
            expect(escaped).toContain('&lt;');
            expect(escaped).toContain('&gt;');
            expect(escaped).toContain('&quot;');
        });
    });

    describe('validateReminderTime', () => {
        test('devrait accepter un horaire valide', () => {
            const times = ['08:00', '12:30', '18:45', '23:59'];
            
            times.forEach(time => {
                const result = Validators.validateReminderTime(time);
                expect(result.valid).toBe(true);
            });
        });

        test('devrait rejeter un horaire invalide', () => {
            const result = Validators.validateReminderTime('25:00');
            expect(result.valid).toBe(false);
        });

        test('devrait accepter un horaire vide (optionnel)', () => {
            const result = Validators.validateReminderTime('');
            expect(result.valid).toBe(true);
        });
    });
});
