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
                // CORRECTION CRITIQUE: Notifier qu'aucune session n'est active
                this.notifyAuthListeners('NO_SESSION', null);
            }
        } catch (error) {
            console.error('❌ Erreur vérification session:', error);
            // Notifier l'erreur aussi
            this.notifyAuthListeners('NO_SESSION', null);
        }
    }

    // ========== INSCRIPTION ==========
    async signUp(formData) {
        try {
            // Rate limiting
            const rateLimitCheck = Validators.checkRateLimit(
                `signup_${formData.email}`, 
                3, // 3 tentatives
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

            // Tentative d'inscription
            const signUpResult = await database.signUp(email, password, {
                full_name: name,
                signup_timestamp: new Date().toISOString(),
                email_verified: false
            });

            if (!signUpResult.success) {
                return { success: false, error: signUpResult.error };
            }

            // Créer le profil utilisateur
            const userProfile = {
                id: signUpResult.data.user.id,
                email: email,
                name: name,
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

            const createUserResult = await database.createUser(userProfile);
            
            if (!createUserResult.success) {
                console.error('❌ Erreur création profil:', createUserResult.error);
                // L'utilisateur auth existe mais pas le profil - on peut continuer
            }

            // Notification de bienvenue
            if (createUserResult.success) {
                await database.createNotification({
                    user_id: signUpResult.data.user.id,
                    type: 'welcome',
                    title: 'Bienvenue sur MotiveMe ! 🎯',
                    message: 'Ton compte a été créé avec succès. Prêt à relever tes premiers challenges ?',
                    read: false
                });
            }

            return {
                success: true,
                message: 'Compte créé avec succès ! Tu peux maintenant te connecter.',
                user: signUpResult.data.user
            };

        } catch (error) {
            console.error('❌ Erreur inscription:', error);
            return { success: false, error: 'Erreur lors de l\'inscription. Réessaie plus tard.' };
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
            }
            
        } catch (error) {
            console.error('❌ Erreur création profil basique:', error);
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
                if (session?.user && !this.currentUser) {
                    console.log('🔄 Chargement profil depuis SIGNED_IN:', session.user.email);
                    this.loadUserProfile(session.user);
                }
                break;
                
            case 'INITIAL_SESSION':
                console.log('🔄 INITIAL_SESSION détecté, vérification session active...');
                this.checkAndLoadActiveSession();
                break;
                
            case 'SIGNED_OUT':
                console.log('🔄 SIGNED_OUT détecté');
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