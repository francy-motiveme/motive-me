// Module d'authentification avancé
import database from './database.js';
import { Validators } from './validators.js';
import { showNotification } from './ui.js';
import badgeManager from './badges.js';

export class AuthManager {
    constructor() {
        this.currentUser = null;
        this.authListeners = [];
        this.isInitialized = false;
        this.loginAttempts = new Map();

        // Écouter les changements d'état d'auth
        database.onAuthStateChange((event, session) => {
            this.handleAuthStateChange(event, session);
        });
    }

    // ========== INITIALISATION ==========
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Connecter à la base de données
            try {
                const dbConnection = await database.connect();
                if (!dbConnection.success && !dbConnection.fallback) {
                    console.warn('⚠️ Connexion base de données échouée, mode dégradé');
                } else {
                    console.log('✅ Database connection établie:', dbConnection.message);
                }
            } catch (error) {
                console.warn('⚠️ Erreur connexion database:', error.message);
            }

            const sessionResult = await database.getCurrentSession();

            if (sessionResult.success && sessionResult.session?.user) {
                await this.loadUserProfile(sessionResult.session.user);
            }

            this.isInitialized = true;
            console.log('✅ AuthManager initialisé');
        } catch (error) {
            console.error('❌ Erreur initialisation auth:', error);
        }
    }

    // ========== VÉRIFICATION SESSION ACTIVE ==========
    async checkAndLoadActiveSession() {
        try {
            console.log('🔄 Vérification session active...');
            const sessionResult = await database.getCurrentSession();

            if (sessionResult.success && sessionResult.session?.user) {
                console.log('✅ Session active trouvée:', sessionResult.session.user.email);
                if (!this.currentUser) {
                    console.log('🔄 Chargement profil depuis session active');
                    await this.loadUserProfile(sessionResult.session.user);
                } else {
                    // Notifier que l'utilisateur est déjà connecté
                    this.notifyAuthListeners('INITIAL_SESSION', this.currentUser);
                }
            } else {
                console.log('⚠️ Aucune session active trouvée');
                this.notifyAuthListeners('NO_SESSION', null);
            }
        } catch (error) {
            console.error('❌ Erreur vérification session:', error);
            this.notifyAuthListeners('NO_SESSION', null);
        }
    }

    // ========== INSCRIPTION ==========
    async signUp(formData) {
        try {
            // Rate limiting (augmentation à 20 tentatives)
            const rateLimitCheck = Validators.checkRateLimit(
                `signup_${formData.email}`,
                20, // 20 tentatives
                30 * 60 * 1000 // 30 minutes
            );

            if (!rateLimitCheck.allowed) {
                return { success: false, error: rateLimitCheck.message };
            }

            // Validation complète du formulaire
            const validation = Validators.validateSignupForm(formData);

            if (!validation.valid) {
                const errorMessage = validation.errors.map(e => e.message).join(', ');
                return { success: false, error: errorMessage };
            }

            const { email, password, name } = validation.data;

            const signUpResult = await database.signUp(email, password, {
                name: name,
                signup_timestamp: new Date().toISOString(),
                email_verified: false
            });

            if (!signUpResult.success) {
                // Gestion spécifique erreur email déjà utilisé
                if (signUpResult.error && signUpResult.error.includes('déjà utilisé')) {
                    return {
                        success: false,
                        error: signUpResult.error,
                        emailExists: true
                    };
                }
                return { success: false, error: signUpResult.error || 'Erreur lors de l\'inscription' };
            }

            // CORRECTION CRITIQUE: Charger le profil ET notifier SIGNED_IN
            await this.loadUserProfile(signUpResult.data.user);

            // S'assurer que SIGNED_IN est bien notifié
            if (this.currentUser) {
                console.log('✅ [AUTH] Notification SIGNED_IN après inscription:', this.currentUser.email);
                this.notifyAuthListeners('SIGNED_IN', this.currentUser);
            }

            return {
                success: true,
                message: signUpResult.message || `Bienvenue ${this.currentUser?.name || 'anonyme'} ! 👋`,
                user: this.currentUser,
                autoLogin: true
            };

        } catch (error) {
            console.error('❌ Erreur inscription:', error);

            // Message d'erreur plus informatif
            let errorMessage = 'Erreur lors de l\'inscription.';

            if (error.message && error.message.includes('Failed to fetch')) {
                errorMessage = 'Erreur de connexion au serveur. Vérifie ta connexion internet.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            return { success: false, error: errorMessage };
        }
    }

    // ========== CONNEXION ==========
    async signIn(formData) {
        try {
            const { email } = formData;

            // Rate limiting par email
            const rateLimitCheck = Validators.checkRateLimit(
                `login_${email}`,
                5, // 5 tentatives
                15 * 60 * 1000 // 15 minutes
            );

            if (!rateLimitCheck.allowed) {
                return { success: false, error: rateLimitCheck.message };
            }

            // Validation du formulaire
            const validation = Validators.validateLoginForm(formData);

            if (!validation.valid) {
                const errorMessage = validation.errors.map(e => e.message).join(', ');
                return { success: false, error: errorMessage };
            }

            const { email: validEmail, password } = validation.data;

            // Tentative de connexion
            const signInResult = await database.signIn(validEmail, password);

            if (!signInResult.success) {
                // Gestion spéciale email_not_confirmed
                if (signInResult.error && signInResult.error.message &&
                    signInResult.error.message.includes('email_not_confirmed')) {

                    console.log('⚠️ Email non confirmé pour:', validEmail);

                    // Proposer options à l'utilisateur
                    this.showEmailConfirmationOptions(validEmail);

                    return {
                        success: false,
                        error: 'Email non confirmé. Vérifie ta boîte mail ou renvoie l\'email de confirmation.',
                        requiresConfirmation: true,
                        email: validEmail
                    };
                }

                // Incrémenter compteur tentatives échouées
                const attempts = this.loginAttempts.get(validEmail) || 0;
                this.loginAttempts.set(validEmail, attempts + 1);

                // Message d'erreur adaptatif
                let errorMessage = 'Email ou mot de passe incorrect';

                if (attempts >= 3) {
                    errorMessage += '. Plusieurs tentatives échouées détectées.';
                }

                return { success: false, error: errorMessage };
            }

            // Réinitialiser compteur tentatives
            this.loginAttempts.delete(validEmail);

            // Charger le profil utilisateur
            await this.loadUserProfile(signInResult.data.user);

            return {
                success: true,
                message: `Bienvenue ${this.currentUser?.name || 'anonyme'} ! 👋`,
                user: this.currentUser
            };

        } catch (error) {
            console.error('❌ Erreur connexion:', error);
            return { success: false, error: 'Erreur de connexion. Vérifie ta connexion internet.' };
        }
    }

    // ========== DÉCONNEXION ==========
    async signOut() {
        try {
            const result = await database.signOut();

            if (result.success) {
                this.currentUser = null;
                this.notifyAuthListeners('SIGNED_OUT', null);
                return { success: true, message: 'Déconnexion réussie' };
            }

            return { success: false, error: 'Erreur lors de la déconnexion' };

        } catch (error) {
            console.error('❌ Erreur déconnexion:', error);
            return { success: false, error: 'Erreur de déconnexion' };
        }
    }

    // ========== CHARGEMENT PROFIL ==========
    async loadUserProfile(authUser) {
        try {
            const profileResult = await database.getUserById(authUser.id);

            if (profileResult.success && profileResult.data) {
                this.currentUser = {
                    id: authUser.id,
                    email: authUser.email,
                    ...profileResult.data,
                    isAuthenticated: true,
                    lastLogin: new Date().toISOString()
                };

                // Mettre à jour last_login
                await database.updateUser(authUser.id, {
                    last_login: new Date().toISOString()
                });

                this.notifyAuthListeners('SIGNED_IN', this.currentUser);
                console.log('✅ Profil utilisateur chargé:', this.currentUser.name);

                // Vérifier les nouveaux badges
                await this.checkUserBadges();

            } else {
                console.warn('⚠️ Profil utilisateur non trouvé pour:', authUser.email);
                // Créer un profil basique
                await this.createMissingProfile(authUser);
            }

        } catch (error) {
            console.error('❌ Erreur chargement profil:', error);
        }
    }

    // ========== CRÉATION PROFIL MANQUANT ==========
    async createMissingProfile(authUser) {
        try {
            const basicProfile = {
                id: authUser.id,
                email: authUser.email,
                name: authUser.user_metadata?.full_name || 'Utilisateur',
                points: 0,
                level: 1,
                badges: [],
                preferences: {
                    notifications: true,
                    email_reminders: true,
                    theme: 'light'
                },
                stats: {
                    challenges_created: 0,
                    challenges_completed: 0,
                    total_checkins: 0,
                    current_streak: 0,
                    longest_streak: 0
                },
                created_at: new Date().toISOString()
            };

            const createResult = await database.createUser(basicProfile);

            if (createResult.success) {
                this.currentUser = {
                    ...basicProfile,
                    isAuthenticated: true,
                    lastLogin: new Date().toISOString()
                };

                this.notifyAuthListeners('SIGNED_IN', this.currentUser);
                console.log('✅ Profil basique créé pour:', authUser.email);
            } else {
                // Mode dégradé si création profil échoue
                console.warn('⚠️ Mode dégradé activé - Profil temporaire');
                this.activateDegradedMode(authUser);
            }

        } catch (error) {
            console.error('❌ Erreur création profil basique:', error);
            // Mode dégradé en cas d'erreur
            this.activateDegradedMode(authUser);
        }
    }

    // ========== MODE DÉGRADÉ ==========
    activateDegradedMode(authUser) {
        try {
            // Créer utilisateur temporaire en mémoire uniquement
            this.currentUser = {
                id: authUser.id,
                email: authUser.email,
                name: authUser.user_metadata?.full_name || 'Utilisateur',
                points: 0,
                level: 1,
                badges: [],
                preferences: {
                    notifications: true,
                    email_reminders: true,
                    theme: 'light'
                },
                stats: {
                    challenges_created: 0,
                    challenges_completed: 0,
                    total_checkins: 0,
                    current_streak: 0,
                    longest_streak: 0
                },
                isAuthenticated: true,
                isDegradedMode: true,
                lastLogin: new Date().toISOString()
            };

            this.notifyAuthListeners('SIGNED_IN', this.currentUser);

            // Notification mode dégradé
            showNotification('⚠️ Mode limité activé. Certaines fonctionnalités peuvent être restreintes.', 'warning');

            console.log('✅ Mode dégradé activé pour:', authUser.email);

        } catch (error) {
            console.error('❌ Erreur activation mode dégradé:', error);
        }
    }

    // ========== MISE À JOUR UTILISATEUR ==========
    async updateUserProfile(updates) {
        if (!this.currentUser) {
            return { success: false, error: 'Utilisateur non connecté' };
        }

        try {
            // Valider les données selon le type de mise à jour
            const sanitizedUpdates = this.sanitizeUserUpdates(updates);

            const updateResult = await database.updateUser(this.currentUser.id, sanitizedUpdates);

            if (updateResult.success) {
                // Mettre à jour l'objet utilisateur local
                this.currentUser = { ...this.currentUser, ...sanitizedUpdates };
                this.notifyAuthListeners('USER_UPDATED', this.currentUser);

                return { success: true, data: this.currentUser };
            }

            return { success: false, error: updateResult.error };

        } catch (error) {
            console.error('❌ Erreur mise à jour profil:', error);
            return { success: false, error: 'Erreur lors de la mise à jour' };
        }
    }

    // ========== SANITISATION MISES À JOUR ==========
    sanitizeUserUpdates(updates) {
        const sanitized = {};

        if (updates.name) {
            const nameValidation = Validators.validateName(updates.name);
            if (nameValidation.valid) {
                sanitized.name = nameValidation.value;
            }
        }

        if (updates.points !== undefined) {
            const points = parseInt(updates.points);
            if (!isNaN(points) && points >= 0) {
                sanitized.points = points;
            }
        }

        if (updates.preferences && typeof updates.preferences === 'object') {
            sanitized.preferences = {
                ...this.currentUser.preferences,
                ...updates.preferences
            };
        }

        if (updates.stats && typeof updates.stats === 'object') {
            sanitized.stats = {
                ...this.currentUser.stats,
                ...updates.stats
            };
        }

        if (updates.badges && Array.isArray(updates.badges)) {
            sanitized.badges = updates.badges;
        }

        return sanitized;
    }

    // ========== GESTION ÉVÉNEMENTS AUTH ==========
    handleAuthStateChange(event, session) {
        console.log('🔄 Auth state change:', event, session?.user?.email || 'no_user');

        switch (event) {
            case 'SIGNED_IN':
            case 'INITIAL_SESSION':
                if (session?.user && !this.currentUser) {
                    console.log('🔄 Chargement profil depuis événement:', event, session.user.email);
                    this.loadUserProfile(session.user);
                } else if (session?.user && this.currentUser) {
                    this.currentUser.session = session;
                    this.notifyAuthListeners('USER_UPDATED', this.currentUser);
                }
                break;

            case 'SIGNED_OUT':
            case 'NO_SESSION':
                console.log('🔄 Aucune session active');
                this.currentUser = null;
                this.notifyAuthListeners('SIGNED_OUT', null);
                break;

            case 'TOKEN_REFRESHED':
                if (session?.user && this.currentUser) {
                    console.log('🔄 Token refreshed pour:', session.user.email);
                    this.currentUser.session = session;
                    this.notifyAuthListeners('TOKEN_REFRESHED', this.currentUser);
                } else if (session?.user && !this.currentUser) {
                    console.log('🔄 Chargement profil depuis TOKEN_REFRESHED');
                    this.loadUserProfile(session.user);
                }
                break;
        }
    }

    // ========== LISTENERS ==========
    addAuthListener(callback) {
        this.authListeners.push(callback);
    }

    removeAuthListener(callback) {
        this.authListeners = this.authListeners.filter(listener => listener !== callback);
    }

    notifyAuthListeners(event, user) {
        this.authListeners.forEach(callback => {
            try {
                callback(event, user);
            } catch (error) {
                console.error('❌ Erreur auth listener:', error);
            }
        });
    }

    // ========== GETTERS ==========
    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return !!this.currentUser?.isAuthenticated;
    }

    getUserId() {
        return this.currentUser?.id || null;
    }

    getUserEmail() {
        return this.currentUser?.email || null;
    }

    getUserName() {
        return this.currentUser?.name || 'Utilisateur';
    }

    getUserPoints() {
        return this.currentUser?.points || 0;
    }

    // ========== GESTION BADGES ==========
    async checkUserBadges() {
        if (!this.currentUser) return;

        try {
            const stats = this.currentUser.stats || {};
            const challenges = []; // À récupérer depuis challengeManager si nécessaire

            const newBadges = await badgeManager.checkForNewBadges(this.currentUser, stats, challenges);

            if (newBadges.length > 0) {
                // Ajouter les nouveaux badges au profil
                const updatedBadges = [...(this.currentUser.badges || []), ...newBadges];
                await this.updateUserProfile({ badges: updatedBadges });

                console.log(`🏆 ${newBadges.length} nouveau(x) badge(s) débloqué(s)`);
            }
        } catch (error) {
            console.error('❌ Erreur vérification badges:', error);
        }
    }

    // ========== GESTION EMAIL CONFIRMATION ==========
    showEmailConfirmationOptions(email) {
        try {
            // Créer interface de confirmation
            const confirmationDiv = document.createElement('div');
            confirmationDiv.className = 'email-confirmation-prompt';
            confirmationDiv.innerHTML = `
                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%);
                           padding: 15px; border-radius: 10px; margin: 15px 0;
                           border-left: 4px solid #f59e0b;">
                    <h4 style="margin: 0 0 10px 0; color: #92400e;">📧 Email non confirmé</h4>
                    <p style="margin: 0 0 15px 0; color: #92400e; font-size: 14px;">
                        Vérifie ta boîte mail et clique sur le lien de confirmation.
                    </p>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button onclick="authManager.resendConfirmation('${email}')"
                                style="background: #f59e0b; color: white; border: none;
                                       padding: 8px 15px; border-radius: 6px; cursor: pointer;
                                       font-size: 13px; font-weight: 600;">
                            📤 Renvoyer l'email
                        </button>
                        <button onclick="authManager.hideEmailConfirmationPrompt()"
                                style="background: #6b7280; color: white; border: none;
                                       padding: 8px 15px; border-radius: 6px; cursor: pointer;
                                       font-size: 13px; font-weight: 600;">
                            ✕ Fermer
                        </button>
                    </div>
                </div>
            `;

            // Ajouter à l'écran de connexion
            const loginScreen = document.getElementById('loginScreen');

            // Supprimer ancien prompt s'il existe
            const existingPrompt = loginScreen.querySelector('.email-confirmation-prompt');
            if (existingPrompt) {
                existingPrompt.remove();
            }

            // Ajouter après le formulaire
            const loginForm = loginScreen.querySelector('.login-form') || loginScreen;
            loginForm.appendChild(confirmationDiv);

            console.log('✅ Prompt confirmation email affiché');

        } catch (error) {
            console.error('❌ Erreur affichage prompt confirmation:', error);
        }
    }

    async resendConfirmation(email) {
        try {
            console.log('📤 Renvoi email confirmation pour:', email);

            if (!database.client) {
                showNotification('Service d\'email non disponible en mode hors ligne', 'warning');
                return;
            }

            const { error } = await database.client.auth.resend({
                type: 'signup',
                email: email
            });

            if (!error) {
                showNotification('📧 Email de confirmation renvoyé ! Vérifie ta boîte mail.', 'success');
                console.log('✅ Email confirmation renvoyé avec succès');
            } else {
                console.error('❌ Erreur renvoi email:', error);
                showNotification('Erreur lors du renvoi de l\'email. Réessaie plus tard.', 'error');
            }

        } catch (error) {
            console.error('❌ Erreur renvoi confirmation:', error);
            showNotification('Erreur technique. Réessaie plus tard.', 'error');
        }
    }

    hideEmailConfirmationPrompt() {
        try {
            const prompt = document.querySelector('.email-confirmation-prompt');
            if (prompt) {
                prompt.remove();
                console.log('✅ Prompt confirmation fermé');
            }
        } catch (error) {
            console.error('❌ Erreur fermeture prompt:', error);
        }
    }

    // ========== UTILITAIRES SÉCURITÉ ==========
    async changePassword(currentPassword, newPassword) {
        if (!this.isAuthenticated()) {
            return { success: false, error: 'Utilisateur non connecté' };
        }

        // Valider le nouveau mot de passe
        const passwordValidation = Validators.validatePassword(newPassword);
        if (!passwordValidation.valid) {
            return { success: false, error: passwordValidation.message };
        }

        try {
            if (!database.client) {
                return { success: false, error: 'Service non disponible en mode hors ligne' };
            }

            // Supabase gère le changement de mot de passe
            const { error } = await database.client.auth.updateUser({
                password: newPassword
            });

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, message: 'Mot de passe mis à jour avec succès' };

        } catch (error) {
            console.error('❌ Erreur changement mot de passe:', error);
            return { success: false, error: 'Erreur lors du changement de mot de passe' };
        }
    }

    async requestPasswordReset(email) {
        const emailValidation = Validators.validateEmail(email);
        if (!emailValidation.valid) {
            return { success: false, error: emailValidation.message };
        }

        try {
            if (!database.client) {
                return { success: false, error: 'Service non disponible en mode hors ligne' };
            }

            const { error } = await database.client.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`
            });

            if (error) {
                return { success: false, error: error.message };
            }

            return {
                success: true,
                message: 'Email de réinitialisation envoyé. Vérifie ta boîte mail.'
            };

        } catch (error) {
            console.error('❌ Erreur reset password:', error);
            return { success: false, error: 'Erreur lors de l\'envoi de l\'email' };
        }
    }
}

// Instance singleton
const authManager = new AuthManager();

export default authManager;