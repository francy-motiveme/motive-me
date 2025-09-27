// Tests E2E - Parcours d'inscription avec Playwright
import { test, expect } from '@playwright/test';

test.describe('Parcours d\'inscription MotiveMe', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('devrait permettre l\'inscription d\'un nouvel utilisateur', async ({ page }) => {
        // Vérifier que la page de connexion est affichée
        await expect(page.locator('#loginScreen.active')).toBeVisible();

        // Cliquer sur le lien d'inscription
        await page.click('text=S\'inscrire');

        // Vérifier que l'écran d'inscription est affiché
        await expect(page.locator('#signupScreen.active')).toBeVisible();

        // Remplir le formulaire d'inscription
        await page.fill('#signupName', 'Test User');
        await page.fill('#signupEmail', 'test@example.com');
        await page.fill('#signupPassword', 'Password123!');

        // Soumettre le formulaire
        await page.click('#signupBtn');

        // Vérifier la redirection vers le dashboard
        await expect(page.locator('#dashboardScreen.active')).toBeVisible();

        // Vérifier que les informations utilisateur sont affichées
        await expect(page.locator('#userEmail')).toContainText('test@example.com');
    });

    test('devrait afficher des erreurs pour un formulaire invalide', async ({ page }) => {
        await page.click('text=S\'inscrire');

        // Essayer de soumettre avec un email invalide
        await page.fill('#signupName', 'Test User');
        await page.fill('#signupEmail', 'email-invalide');
        await page.fill('#signupPassword', '123');

        await page.click('#signupBtn');

        // Vérifier que des erreurs sont affichées
        await expect(page.locator('.notification.error')).toBeVisible();
    });

    test('devrait permettre la navigation entre connexion et inscription', async ({ page }) => {
        // Par défaut sur la connexion
        await expect(page.locator('#loginScreen.active')).toBeVisible();

        // Aller vers l'inscription
        await page.click('text=S\'inscrire');
        await expect(page.locator('#signupScreen.active')).toBeVisible();

        // Retourner vers la connexion
        await page.click('text=Se connecter');
        await expect(page.locator('#loginScreen.active')).toBeVisible();
    });
});