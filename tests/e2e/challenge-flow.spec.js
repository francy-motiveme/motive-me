// Tests E2E - Parcours complet de challenge avec Playwright
import { test, expect } from '@playwright/test';

test.describe('Parcours complet de challenge', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        
        // Inscription/connexion préalable
        await page.click('text=S\'inscrire');
        await page.fill('#signupName', 'Test User');
        await page.fill('#signupEmail', `test${Date.now()}@example.com`);
        await page.fill('#signupPassword', 'Password123!');
        await page.click('#signupBtn');
        
        // Attendre l'affichage du dashboard
        await expect(page.locator('#dashboardScreen.active')).toBeVisible();
    });

    test('devrait permettre la création d\'un challenge complet', async ({ page }) => {
        // Cliquer sur "Créer un nouveau challenge"
        await page.click('text=➕ Créer un nouveau challenge');

        // Vérifier l'affichage de l'écran de création
        await expect(page.locator('#createChallengeScreen.active')).toBeVisible();

        // Remplir le formulaire de challenge
        await page.fill('#challengeTitle', 'Méditer 15 minutes par jour');
        await page.selectOption('#challengeDuration', '30'); // 1 mois
        await page.selectOption('#challengeFrequency', 'daily');
        await page.fill('input[type="email"]', 'witness@example.com');
        
        // Sélectionner un gage
        await page.click('.gage-option:first-child');
        
        // Créer le challenge
        await page.click('text=Créer le Challenge');

        // Vérifier la redirection vers le dashboard
        await expect(page.locator('#dashboardScreen.active')).toBeVisible();

        // Vérifier que le challenge apparaît dans la liste
        await expect(page.locator('.challenge-card')).toBeVisible();
        await expect(page.locator('.challenge-title')).toContainText('Méditer 15 minutes');
    });

    test('devrait permettre de faire un check-in', async ({ page }) => {
        // Créer d'abord un challenge (code répété pour clarté)
        await page.click('text=➕ Créer un nouveau challenge');
        await page.fill('#challengeTitle', 'Lire 30 minutes');
        await page.selectOption('#challengeDuration', '7');
        await page.fill('input[type="email"]', 'witness@example.com');
        await page.click('.gage-option:first-child');
        await page.click('text=Créer le Challenge');

        // Attendre l'affichage du challenge dans la liste
        await expect(page.locator('.challenge-card')).toBeVisible();

        // Cliquer sur le challenge pour l'ouvrir
        await page.click('.challenge-card');

        // Faire un check-in pour aujourd'hui
        await page.click('.day-box:not(.not-required):first');

        // Remplir les détails du check-in
        await page.fill('#proofText', 'J\'ai lu "1984" pendant 35 minutes dans le métro');
        await page.click('text=Valider le Check-in');

        // Vérifier que le check-in est enregistré
        await expect(page.locator('.day-box.checked')).toBeVisible();
        await expect(page.locator('.notification.success')).toBeVisible();
    });

    test('devrait afficher les statistiques mises à jour', async ({ page }) => {
        // Après avoir créé un challenge et fait un check-in
        await page.click('text=➕ Créer un nouveau challenge');
        await page.fill('#challengeTitle', 'Exercice physique');
        await page.selectOption('#challengeDuration', '14');
        await page.fill('input[type="email"]', 'witness@example.com');
        await page.click('.gage-option:first-child');
        await page.click('text=Créer le Challenge');

        // Faire un check-in
        await page.click('.challenge-card');
        await page.click('.day-box:not(.not-required):first');
        await page.fill('#proofText', 'Course de 30 minutes au parc');
        await page.click('text=Valider le Check-in');

        // Vérifier que les stats sont mises à jour
        await expect(page.locator('#streakCount')).not.toContainText('0');
        await expect(page.locator('#totalPoints')).not.toContainText('0');
    });

    test('devrait gérer les jours non requis', async ({ page }) => {
        // Créer un challenge avec fréquence personnalisée
        await page.click('text=➕ Créer un nouveau challenge');
        await page.fill('#challengeTitle', 'Yoga le weekend');
        await page.selectOption('#challengeFrequency', 'custom');
        
        // Sélectionner seulement samedi et dimanche
        await page.click('.day-chip[data-day="6"]'); // Samedi
        await page.click('.day-chip[data-day="0"]'); // Dimanche
        
        await page.fill('input[type="email"]', 'witness@example.com');
        await page.click('.gage-option:first-child');
        await page.click('text=Créer le Challenge');

        // Ouvrir le challenge
        await page.click('.challenge-card');

        // Vérifier que les jours non requis sont désactivés
        const disabledDays = page.locator('.day-box.not-required');
        await expect(disabledDays).toHaveCount(5); // Lundi à vendredi
    });
});