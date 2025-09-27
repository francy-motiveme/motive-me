// Application principale - Point d'entrée
import authManager from './modules/auth.js';
import challengeManager from './modules/challenges.js';
import uiManager, { showNotification, showScreen, setLoading } from './modules/ui.js';
import { Validators } from './modules/validators.js';
import badgeManager from './modules/badges.js';
import emailService from './modules/email.js';
import analyticsManager from './modules/analytics.js';

class MotiveMeApp {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.selectedGage = null;
        this.selectedDays = [];
        this.currentChallengeId = null;
        this.activeTab = 'challenges';
    }

    // ========== INITIALISATION ==========
    async init() {
        if (this.isInitialized) return;

        try {
            console.log('🚀 Initialisation MotiveMe...');

            // Initialiser les managers
            await authManager.initialize();
            
            // Écouter les changements d'authentification
            authManager.addAuthListener((event, user) => {
                this.handleAuthChange(event, user);
            });

            // Initialiser l'interface
            this.initializeUI();
            
            // Vérifier si utilisateur déjà connecté
            const currentUser = authManager.getCurrentUser();
            if (currentUser) {
                this.currentUser = currentUser;
                await this.loadDashboard();
                showScreen('dashboardScreen');
                this.updateUserInfo();
            } else {
                showScreen('loginScreen');
            }

            this.isInitialized = true;
            console.log('✅ MotiveMe initialisé avec succès');

            // Message de bienvenue différé
            setTimeout(() => {
                if (!authManager.isAuthenticated()) {
                    showNotification('🎯 Bienvenue sur MotiveMe ! Crée ton compte pour commencer');
                }
            }, 1000);

        } catch (error) {
            console.error('❌ Erreur initialisation:', error);
            showNotification('Erreur lors du chargement de l\'application', 'error');
        }
    }

    // ========== GESTION UI ==========
    initializeUI() {
        // Exposer les fonctions globalement pour les onclick dans HTML
        window.login = () => this.login();
        window.signup = () => this.signup();
        window.logout = () => this.logout();
        window.createChallenge = () => this.createChallenge();
        window.checkIn = () => this.checkIn();
        window.switchTab = (tab) => this.switchTab(tab);
        window.showScreen = (screenId) => uiManager.showScreen(screenId);
        window.toggleDaysSelector = () => this.toggleDaysSelector();
        window.toggleDay = (element) => this.toggleDay(element);
        window.selectGage = (element, gage) => this.selectGage(element, gage);
        window.viewChallenge = (id) => this.viewChallenge(id);
        window.uploadProof = () => this.uploadProof();
        window.loadRecentBadges = () => this.loadRecentBadges();
        window.loadBadgesScreen = () => this.loadBadgesScreen();

        // Gérer les changements d'écran
        document.addEventListener('screenChange', (e) => {
            console.log('📱 Changement écran:', e.detail.screenId);
        });

        // Gérer la validation en temps réel
        this.setupFormValidation();
    }

    setupFormValidation() {
        // Validation email en temps réel
        const emailInputs = document.querySelectorAll('input[type="email"]');
        emailInputs.forEach(input => {
            input.addEventListener('blur', () => {
                const validation = Validators.validateEmail(input.value);
                this.showFieldValidation(input, validation);
            });
        });

        // Validation mot de passe en temps réel
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        passwordInputs.forEach(input => {
            input.addEventListener('blur', () => {
                const validation = Validators.validatePassword(input.value);
                this.showFieldValidation(input, validation);
            });
        });
    }

    showFieldValidation(input, validation) {
        const errorId = input.id + '-error';
        let errorEl = document.getElementById(errorId);
        
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.id = errorId;
            errorEl.className = 'field-error';
            input.parentNode.appendChild(errorEl);
        }

        if (validation.valid) {
            input.classList.remove('error');
            input.classList.add('valid');
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        } else {
            input.classList.add('error');
            input.classList.remove('valid');
            errorEl.textContent = validation.message;
            errorEl.style.display = 'block';
        }
    }

    // ========== AUTHENTIFICATION ==========
    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        setLoading('loginBtn', true, 'Connexion...');

        try {
            const result = await authManager.signIn({ email, password });

            if (result.success) {
                showNotification(result.message);
                // Le changement d'écran sera géré par handleAuthChange
            } else {
                showNotification(result.error, 'error');
            }
        } catch (error) {
            console.error('❌ Erreur login:', error);
            showNotification('Erreur de connexion', 'error');
        } finally {
            setLoading('loginBtn', false);
        }
    }

    async signup() {
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;

        setLoading('signupBtn', true, 'Création...');

        try {
            const result = await authManager.signUp({ name, email, password });

            if (result.success) {
                showNotification(result.message);
                showScreen('loginScreen');
                
                // Pré-remplir l'email de connexion
                document.getElementById('loginEmail').value = email;
            } else {
                showNotification(result.error, 'error');
            }
        } catch (error) {
            console.error('❌ Erreur signup:', error);
            showNotification('Erreur lors de l\'inscription', 'error');
        } finally {
            setLoading('signupBtn', false);
        }
    }

    async logout() {
        try {
            const result = await authManager.signOut();
            
            if (result.success) {
                showNotification(result.message);
                // Le changement d'écran sera géré par handleAuthChange
            } else {
                showNotification(result.error, 'error');
            }
        } catch (error) {
            console.error('❌ Erreur logout:', error);
            showNotification('Erreur de déconnexion', 'error');
        }
    }

    // ========== GESTION CHANGEMENTS AUTH ==========
    handleAuthChange(event, user) {
        console.log('🔄 Auth change:', event, user?.email);

        switch (event) {
            case 'SIGNED_IN':
                this.currentUser = user;
                showScreen('dashboardScreen');
                this.updateUserInfo();
                this.loadDashboard();
                break;

            case 'SIGNED_OUT':
                this.currentUser = null;
                showScreen('loginScreen');
                this.clearUserInfo();
                break;

            case 'USER_UPDATED':
                this.currentUser = user;
                this.updateUserInfo();
                break;
        }
    }

    // ========== INTERFACE UTILISATEUR ==========
    updateUserInfo() {
        if (!this.currentUser) return;

        const userInfo = document.getElementById('userInfo');
        const userEmail = document.getElementById('userEmail');
        const userPoints = document.getElementById('userPoints');
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');

        if (userInfo) {
            userInfo.style.display = 'flex';
        }

        if (userEmail) {
            userEmail.textContent = this.currentUser.email;
        }

        if (userPoints) {
            userPoints.textContent = `${this.currentUser.points || 0} pts`;
        }

        if (profileName) {
            profileName.textContent = this.currentUser.name || 'Utilisateur';
        }

        if (profileEmail) {
            profileEmail.textContent = this.currentUser.email;
        }
    }

    clearUserInfo() {
        const userInfo = document.getElementById('userInfo');
        if (userInfo) {
            userInfo.style.display = 'none';
        }
    }

    // ========== DASHBOARD ==========
    async loadDashboard() {
        if (!this.currentUser) return;

        try {
            // Charger les challenges
            const result = await challengeManager.loadUserChallenges(this.currentUser.id);
            
            if (result.success) {
                this.renderChallengesList(result.data);
                this.updateStats(result.data);
                
                // Mettre à jour le badge
                const badge = document.getElementById('challengesBadge');
                if (badge) {
                    badge.textContent = result.data.length;
                }
            } else {
                showNotification('Erreur lors du chargement des challenges', 'error');
            }
        } catch (error) {
            console.error('❌ Erreur loadDashboard:', error);
            showNotification('Erreur lors du chargement du dashboard', 'error');
        }
    }

    renderChallengesList(challenges) {
        const challengesList = document.getElementById('challengesList');
        if (!challengesList) return;

        if (challenges.length === 0) {
            challengesList.innerHTML = `
                <div class="empty-state">
                    <p>Aucun challenge actif</p>
                    <p style="margin-top: 10px;">Crée ton premier challenge pour commencer ! 🚀</p>
                </div>
            `;
            return;
        }

        challengesList.innerHTML = challenges.map(challenge => {
            const progress = this.calculateProgress(challenge);
            const statusClass = `status-${challenge.status}`;
            
            return `
                <div class="challenge-card" onclick="viewChallenge(${challenge.id})">
                    <div class="challenge-header">
                        <div class="challenge-title">${challenge.title}</div>
                        <div class="challenge-status ${statusClass}">${challenge.status}</div>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <p style="color: #6b7280; font-size: 14px; margin-top: 10px;">
                        Témoin : ${challenge.witness_email}
                    </p>
                </div>
            `;
        }).join('');
    }

    updateStats(challenges) {
        const stats = challengeManager.getChallengeStats(challenges);
        
        // Mettre à jour les statistiques
        const streakCount = document.getElementById('streakCount');
        const completionRate = document.getElementById('completionRate');
        const totalPoints = document.getElementById('totalPoints');

        if (streakCount) streakCount.textContent = stats.maxStreak;
        if (completionRate) completionRate.textContent = `${stats.avgCompletionRate}%`;
        if (totalPoints) totalPoints.textContent = this.currentUser.points || 0;
    }

    calculateProgress(challenge) {
        if (!challenge.occurrences) return 0;
        
        const totalOccurrences = challenge.occurrences.length;
        const checkedOccurrences = challenge.occurrences.filter(o => o.checked).length;
        return totalOccurrences > 0 ? Math.round((checkedOccurrences / totalOccurrences) * 100) : 0;
    }

    // ========== GESTION ONGLETS ==========
    switchTab(tabName) {
        this.activeTab = tabName;
        
        // Mettre à jour les onglets visuels
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelector(`[onclick="switchTab('${tabName}')"]`)?.classList.add('active');

        // Afficher/masquer les contenus
        document.querySelectorAll('[id$="Tab"]').forEach(content => {
            content.style.display = 'none';
        });

        const targetTab = document.getElementById(`${tabName}Tab`);
        if (targetTab) {
            targetTab.style.display = 'block';
        }

        // Charger les données selon l'onglet
        if (tabName === 'challenges') {
            challengeManager.loadDashboard();
            // Charger aussi les badges récents
            this.loadRecentBadges();
        }
        
        console.log(`📱 Onglet ${tabName} activé`);

        this.activeTab = tabName;
    }

    // ========== CRÉATION CHALLENGE ==========
    toggleDaysSelector() {
        const frequency = document.getElementById('challengeFrequency').value;
        const daysSelector = document.getElementById('daysSelector');
        
        if (daysSelector) {
            daysSelector.style.display = frequency === 'custom' ? 'block' : 'none';
        }
    }

    toggleDay(element) {
        const day = parseInt(element.dataset.day);
        
        if (element.classList.contains('selected')) {
            element.classList.remove('selected');
            this.selectedDays = this.selectedDays.filter(d => d !== day);
        } else {
            element.classList.add('selected');
            this.selectedDays.push(day);
        }
    }

    selectGage(element, gage) {
        // Désélectionner tous les gages
        document.querySelectorAll('.gage-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Sélectionner le nouveau
        element.classList.add('selected');
        this.selectedGage = gage;
        
        // Afficher/masquer le champ personnalisé
        const customGage = document.getElementById('customGage');
        if (customGage) {
            customGage.style.display = gage === 'custom' ? 'block' : 'none';
        }
    }

    async createChallenge() {
        const title = document.getElementById('challengeTitle').value;
        const duration = parseInt(document.getElementById('challengeDuration').value);
        const frequency = document.getElementById('challengeFrequency').value;
        const witnessEmail = document.getElementById('witnessEmail').value;
        const reminderTime = document.getElementById('reminderTime').value;

        let gageText = '';
        if (this.selectedGage === 'pompes') gageText = 'Faire 30 pompes';
        else if (this.selectedGage === 'cafe') gageText = 'Payer un café/resto au témoin';
        else if (this.selectedGage === 'photo') gageText = 'Poster une photo embarrassante';
        else if (this.selectedGage === 'don') gageText = 'Faire un don de 10€';
        else if (this.selectedGage === 'custom') gageText = document.getElementById('customGage').value;

        setLoading('createChallengeBtn', true, 'Création...');

        try {
            const formData = {
                title,
                duration,
                frequency,
                customDays: frequency === 'custom' ? this.selectedDays : [],
                witnessEmail,
                gage: gageText,
                reminderTime
            };

            const result = await challengeManager.createChallenge(formData, this.currentUser.id);

            if (result.success) {
                showNotification(result.message);
                
                // Mettre à jour les points utilisateur
                const pointsUpdate = await authManager.updateUserProfile({
                    points: this.currentUser.points + 10
                });

                // Réinitialiser le formulaire
                this.resetCreateChallengeForm();
                
                // Retourner au dashboard
                showScreen('dashboardScreen');
                this.loadDashboard();
            } else {
                if (result.errors) {
                    const errorMessages = result.errors.map(e => e.message).join('\n');
                    showNotification(errorMessages, 'error');
                } else {
                    showNotification(result.error, 'error');
                }
            }
        } catch (error) {
            console.error('❌ Erreur createChallenge:', error);
            showNotification('Erreur lors de la création du challenge', 'error');
        } finally {
            setLoading('createChallengeBtn', false);
        }
    }

    resetCreateChallengeForm() {
        // Réinitialiser les sélections
        this.selectedDays = [];
        this.selectedGage = null;
        
        // Réinitialiser les éléments visuels
        document.querySelectorAll('.day-chip').forEach(chip => {
            chip.classList.remove('selected');
        });
        
        document.querySelectorAll('.gage-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Réinitialiser les champs
        const form = document.getElementById('createChallengeScreen');
        if (form) {
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                if (input.type !== 'time') {
                    input.value = '';
                }
            });
        }
    }

    // ========== DÉTAIL CHALLENGE ==========
    viewChallenge(challengeId) {
        this.currentChallengeId = challengeId;
        const challenge = challengeManager.getChallengeById(challengeId);
        
        if (!challenge) {
            showNotification('Challenge non trouvé', 'error');
            return;
        }

        // Mettre à jour les informations
        const detailTitle = document.getElementById('detailTitle');
        const detailWitness = document.getElementById('detailWitness');
        const detailGage = document.getElementById('detailGage');

        if (detailTitle) detailTitle.textContent = challenge.title;
        if (detailWitness) detailWitness.textContent = challenge.witness_email;
        if (detailGage) detailGage.textContent = challenge.gage;

        this.renderWeeklyCheckins(challenge);
        this.updateChallengeProgress(challenge);
        this.updateCheckinButton(challenge);

        showScreen('challengeDetailScreen');
    }

    renderWeeklyCheckins(challenge) {
        const grid = document.getElementById('checkinGrid');
        if (!grid) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Calculer la semaine courante (Lundi à Dimanche)
        const startOfWeek = new Date(today);
        const dayOfWeek = today.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startOfWeek.setDate(today.getDate() - daysToMonday);

        const weekDays = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);

            const occurrence = challenge.occurrences?.find(o => {
                const oDate = new Date(o.date);
                oDate.setHours(0, 0, 0, 0);
                return oDate.getTime() === date.getTime();
            });

            weekDays.push({
                date,
                occurrence,
                isToday: date.getTime() === today.getTime()
            });
        }

        grid.innerHTML = weekDays.map((day, index) => {
            const dateStr = this.formatDayLabel(day.date);
            const isChecked = day.occurrence?.checked || false;
            const isRequired = day.occurrence?.required || false;
            
            let classes = 'day-box';
            if (isChecked) classes += ' checked';
            if (!isRequired) classes += ' not-required';

            return `
                <div class="${classes}">
                    <div style="font-size: 11px; font-weight: 600;">${dateStr}</div>
                    ${isChecked ? '<div style="font-size: 20px;">✓</div>' : 
                      day.isToday && isRequired ? '<div style="font-size: 10px;">Aujourd\'hui</div>' : ''}
                </div>
            `;
        }).join('');
    }

    formatDayLabel(date) {
        return date.toLocaleDateString('fr-FR', {
            weekday: 'short',
            day: 'numeric'
        });
    }

    updateChallengeProgress(challenge) {
        const progressEl = document.getElementById('detailProgress');
        const statsEl = document.getElementById('detailStats');

        if (progressEl) {
            const progress = this.calculateProgress(challenge);
            progressEl.style.width = `${progress}%`;
        }

        if (statsEl) {
            const checkedCount = challenge.occurrences?.filter(o => o.checked).length || 0;
            const totalCount = challenge.occurrences?.length || 0;
            const streak = challengeManager.calculateStreak(challenge);
            
            statsEl.textContent = `${checkedCount} / ${totalCount} complétés • Série : ${streak} 🔥`;
        }
    }

    updateCheckinButton(challenge) {
        const btn = document.getElementById('checkinBtn');
        if (!btn) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayOccurrence = challenge.occurrences?.find(o => {
            const oDate = new Date(o.date);
            oDate.setHours(0, 0, 0, 0);
            return oDate.getTime() === today.getTime();
        });

        if (!todayOccurrence) {
            btn.textContent = 'Pas de check-in prévu aujourd\'hui';
            btn.disabled = true;
            btn.style.opacity = '0.5';
        } else if (todayOccurrence.checked) {
            btn.textContent = '✓ Check-in fait aujourd\'hui';
            btn.disabled = true;
            btn.style.opacity = '0.5';
        } else {
            btn.textContent = '✅ Check-in du jour';
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    }

    // ========== CHECK-IN ==========
    async checkIn() {
        if (!this.currentChallengeId) return;

        setLoading('checkinBtn', true, 'Validation...');

        try {
            const result = await challengeManager.checkIn(this.currentChallengeId);

            if (result.success) {
                showNotification(result.data.message);
                
                // Mettre à jour les points utilisateur
                await authManager.updateUserProfile({
                    points: this.currentUser.points + result.data.pointsGained
                });

                // Rafraîchir l'affichage
                this.viewChallenge(this.currentChallengeId);
                this.updateUserInfo();
            } else {
                showNotification(result.error, 'error');
            }
        } catch (error) {
            console.error('❌ Erreur checkIn:', error);
            showNotification('Erreur lors du check-in', 'error');
        } finally {
            setLoading('checkinBtn', false);
        }
    }

    // ========== UPLOAD PREUVE ==========
    uploadProof() {
        showNotification('📸 Fonctionnalité de preuve photo disponible dans la version complète !');
    }

    // ========== GESTION ÉCRANS ==========
    showScreen(screenId) {
        uiManager.showScreen(screenId);
        
        // Charger les données selon l'écran
        if (screenId === 'badgesScreen') {
            this.loadBadgesScreen();
        }
    }

    // ========== GESTION BADGES ==========
    async loadRecentBadges() {
        const recentBadgesEl = document.getElementById('recentBadges');
        if (!recentBadgesEl || !authManager.isAuthenticated()) return;

        try {
            const user = authManager.getCurrentUser();
            const badges = user.badges || [];
            
            if (badges.length === 0) {
                recentBadgesEl.innerHTML = `
                    <div class="no-badges" style="text-align: center; color: #6b7280; font-size: 14px; width: 100%; padding: 20px;">
                        Complétez des challenges pour débloquer des badges !
                    </div>
                `;
                return;
            }

            // Afficher les 5 badges les plus récents
            const recentBadges = badges
                .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt))
                .slice(0, 5);

            recentBadgesEl.innerHTML = recentBadges.map(badge => `
                <div class="badge-mini earned">
                    <div class="badge-mini-icon">${badge.icon}</div>
                    <div class="badge-mini-name">${badge.name}</div>
                </div>
            `).join('');

        } catch (error) {
            console.error('❌ Erreur chargement badges récents:', error);
        }
    }

    async loadBadgesScreen() {
        const badgeCountEl = document.getElementById('badgeCount');
        const badgePointsEl = document.getElementById('badgePoints');
        const badgeCategoriesEl = document.getElementById('badgeCategories');
        
        if (!authManager.isAuthenticated()) return;

        try {
            const user = authManager.getCurrentUser();
            const userBadges = user.badges || [];
            const stats = badgeManager.getUserBadgeStats(userBadges);
            
            // Mettre à jour les statistiques
            if (badgeCountEl) badgeCountEl.textContent = userBadges.length;
            if (badgePointsEl) badgePointsEl.textContent = stats.totalPoints;

            // Générer les catégories de badges
            if (badgeCategoriesEl) {
                const categories = ['starter', 'streak', 'achievement', 'social', 'special', 'level'];
                const userBadgeIds = userBadges.map(b => b.id);

                let html = '';
                for (const type of categories) {
                    const typeBadges = badgeManager.getBadgesByType(type);
                    if (typeBadges.length === 0) continue;

                    const typeNames = {
                        starter: '🎯 Premiers Pas',
                        streak: '🔥 Séries',
                        achievement: '🏆 Accomplissements',
                        social: '👥 Social',
                        special: '✨ Spéciaux',
                        level: '📊 Niveaux'
                    };

                    html += `
                        <div class="badge-category">
                            <h3>${typeNames[type]}</h3>
                            <div class="badges-grid">
                    `;

                    typeBadges.forEach(badge => {
                        const earned = userBadgeIds.includes(badge.id);
                        const progress = !earned ? badgeManager.getBadgeProgress(badge.id, user, user.stats || {}, []) : null;
                        html += badgeManager.getBadgeHTML(badge, earned, progress);
                    });

                    html += `
                            </div>
                        </div>
                    `;
                }

                badgeCategoriesEl.innerHTML = html || '<div class="no-badges">Aucun badge disponible pour le moment.</div>';
            }

        } catch (error) {
            console.error('❌ Erreur chargement écran badges:', error);
            if (badgeCategoriesEl) {
                badgeCategoriesEl.innerHTML = '<div class="error">Erreur lors du chargement des badges.</div>';
            }
        }
    }
}

// ========== INITIALISATION GLOBALE ==========
const app = new MotiveMeApp();

// Initialiser quand le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}

// Exposer l'app globalement pour debug
window.motiveMeApp = app;

export default app;