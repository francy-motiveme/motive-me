// Tests unitaires - Module Email
import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock de fetch global
global.fetch = jest.fn();

describe('Email Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('sendWitnessInvitation', () => {
        test('devrait envoyer une invitation au témoin', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            const emailService = require('../../js/modules/email.js').default;
            
            const result = await emailService.sendWitnessInvitation({
                witnessEmail: 'witness@example.com',
                challengeTitle: 'Mon défi',
                userName: 'John Doe'
            });

            expect(result.success).toBe(true);
            expect(global.fetch).toHaveBeenCalled();
        });

        test('devrait gérer les erreurs d\'envoi', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            const emailService = require('../../js/modules/email.js').default;
            
            const result = await emailService.sendWitnessInvitation({
                witnessEmail: 'witness@example.com',
                challengeTitle: 'Mon défi',
                userName: 'John Doe'
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('erreur');
        });
    });

    describe('sendDailyReminder', () => {
        test('devrait envoyer un rappel quotidien', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            const emailService = require('../../js/modules/email.js').default;
            
            const result = await emailService.sendDailyReminder({
                userEmail: 'user@example.com',
                challengeTitle: 'Mon défi',
                reminderTime: '09:00'
            });

            expect(result.success).toBe(true);
        });
    });

    describe('sendCheckInNotification', () => {
        test('devrait notifier le témoin d\'un check-in', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            const emailService = require('../../js/modules/email.js').default;
            
            const result = await emailService.sendCheckInNotification({
                witnessEmail: 'witness@example.com',
                userName: 'John Doe',
                challengeTitle: 'Mon défi',
                proof: 'J\'ai couru 5km ce matin'
            });

            expect(result.success).toBe(true);
        });
    });

    describe('sendGageReminder', () => {
        test('devrait envoyer un rappel de gage', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            const emailService = require('../../js/modules/email.js').default;
            
            const result = await emailService.sendGageReminder({
                userEmail: 'user@example.com',
                challengeTitle: 'Mon défi',
                gage: 'Faire 50 pompes'
            });

            expect(result.success).toBe(true);
        });
    });

    describe('validateEmailTemplate', () => {
        test('devrait valider un template d\'email', () => {
            const emailService = require('../../js/modules/email.js').default;
            
            const template = {
                to: 'test@example.com',
                subject: 'Test',
                body: 'Test email'
            };

            const isValid = emailService.validateEmailTemplate(template);
            expect(isValid).toBe(true);
        });

        test('devrait rejeter un template invalide', () => {
            const emailService = require('../../js/modules/email.js').default;
            
            const template = {
                to: 'invalid-email',
                subject: '',
                body: ''
            };

            const isValid = emailService.validateEmailTemplate(template);
            expect(isValid).toBe(false);
        });
    });
});
