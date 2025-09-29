// Tests unitaires - Module UI
import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe('UI Module', () => {
    let uiManager;

    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = `
            <div id="loginScreen" class="screen"></div>
            <div id="dashboardScreen" class="screen"></div>
            <div id="notification" class="notification"></div>
            <button id="testBtn">Test</button>
        `;
    });

    describe('showScreen', () => {
        test('devrait afficher l\'écran demandé et masquer les autres', () => {
            const { showScreen } = require('../../js/modules/ui.js');
            
            showScreen('dashboardScreen');
            
            const loginScreen = document.getElementById('loginScreen');
            const dashboardScreen = document.getElementById('dashboardScreen');
            
            expect(loginScreen.classList.contains('active')).toBe(false);
            expect(dashboardScreen.classList.contains('active')).toBe(true);
        });

        test('devrait émettre un événement de changement d\'écran', () => {
            const { showScreen } = require('../../js/modules/ui.js');
            let eventFired = false;
            
            document.addEventListener('screenChange', (e) => {
                eventFired = true;
                expect(e.detail.screenId).toBe('loginScreen');
            });
            
            showScreen('loginScreen');
            expect(eventFired).toBe(true);
        });
    });

    describe('showNotification', () => {
        test('devrait afficher une notification de succès', () => {
            const { showNotification } = require('../../js/modules/ui.js');
            
            showNotification('Test réussi', 'success');
            
            const notification = document.getElementById('notification');
            expect(notification.textContent).toContain('Test réussi');
            expect(notification.classList.contains('success')).toBe(true);
        });

        test('devrait afficher une notification d\'erreur', () => {
            const { showNotification } = require('../../js/modules/ui.js');
            
            showNotification('Erreur test', 'error');
            
            const notification = document.getElementById('notification');
            expect(notification.classList.contains('error')).toBe(true);
        });

        test('devrait masquer la notification après délai', (done) => {
            const { showNotification } = require('../../js/modules/ui.js');
            
            showNotification('Test temporaire', 'info');
            
            setTimeout(() => {
                const notification = document.getElementById('notification');
                expect(notification.classList.contains('show')).toBe(false);
                done();
            }, 3500);
        });
    });

    describe('setLoading', () => {
        test('devrait activer l\'état de chargement sur un bouton', () => {
            const { setLoading } = require('../../js/modules/ui.js');
            
            setLoading('testBtn', true, 'Chargement...');
            
            const btn = document.getElementById('testBtn');
            expect(btn.disabled).toBe(true);
            expect(btn.textContent).toBe('Chargement...');
        });

        test('devrait désactiver l\'état de chargement', () => {
            const { setLoading } = require('../../js/modules/ui.js');
            const btn = document.getElementById('testBtn');
            const originalText = btn.textContent;
            
            setLoading('testBtn', true, 'Chargement...');
            setLoading('testBtn', false);
            
            expect(btn.disabled).toBe(false);
            expect(btn.textContent).toBe(originalText);
        });
    });

    describe('formatDate', () => {
        test('devrait formater une date correctement', () => {
            const { formatDate } = require('../../js/modules/ui.js');
            
            const date = new Date('2025-09-29T10:00:00');
            const formatted = formatDate(date);
            
            expect(formatted).toContain('29');
            expect(formatted).toContain('sept');
        });
    });

    describe('calculateDaysRemaining', () => {
        test('devrait calculer les jours restants correctement', () => {
            const { calculateDaysRemaining } = require('../../js/modules/ui.js');
            
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 7);
            
            const days = calculateDaysRemaining(endDate);
            expect(days).toBe(7);
        });

        test('devrait retourner 0 pour une date passée', () => {
            const { calculateDaysRemaining } = require('../../js/modules/ui.js');
            
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 7);
            
            const days = calculateDaysRemaining(pastDate);
            expect(days).toBe(0);
        });
    });
});
