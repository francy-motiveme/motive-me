// Module de gestion des challenges
import database from './database.js';
import { Validators } from './validators.js';
import uiManager from './ui.js';
import emailService from './email.js';

export class ChallengeManager {
    constructor() {
        this.challenges = [];
        this.currentChallenge = null;
        this.subscriptions = [];
        this.streakCalculationCache = new Map();
    }

    // ========== CRÉATION DE CHALLENGE ==========
    async createChallenge(formData, userId) {
        try {
            // Validation des données
            const validation = Validators.validateChallengeForm(formData);
            if (!validation.valid) {
                return {
                    success: false,
                    errors: validation.errors
                };
            }

            const validData = validation.data;

            // Générer les occurrences
            const startDate = new Date();
            const occurrences = this.generateOccurrences(
                startDate,
                validData.duration,
                validData.frequency,
                validData.customDays || []
            );

            // Construire l'objet challenge
            const challengeData = {
                user_id: userId,
                title: validData.title,
                duration: validData.duration,
                frequency: validData.frequency,
                custom_days: validData.customDays || [],
                witness_email: validData.witnessEmail,
                gage: validData.gage,
                status: 'active',
                start_date: startDate.toISOString(),
                end_date: new Date(Date.now() + validData.duration * 24 * 60 * 60 * 1000).toISOString(),
                occurrences: occurrences,
                timezone: this.getUserTimezone(),
                reminder_time: formData.reminderTime || '20:00',
                completion_rate: 0,
                current_streak: 0,
                points_earned: 0,
                metadata: {
                    created_via: 'web',
                    version: '1.0'
                }
            };

            // Créer en base
            const result = await database.createChallenge(challengeData);
            
            if (!result.success) {
                return result;
            }

            // Ajouter à la liste locale
            this.challenges.push(result.data);

            // Créer notification de bienvenue pour le témoin
            await this.notifyWitness(result.data, 'new_challenge');
            
            // Envoyer email au témoin
            await emailService.notifyNewChallenge(result.data, validData.witnessEmail);

            // Créer notification utilisateur
            await database.createNotification({
                user_id: userId,
                type: 'challenge_created',
                title: 'Challenge créé ! 🎯',
                message: `Ton challenge "${validData.title}" est maintenant actif. Un email a été envoyé à ton témoin.`,
                read: false
            });

            return {
                success: true,
                data: result.data,
                message: `Challenge "${validData.title}" créé avec succès !`
            };

        } catch (error) {
            console.error('❌ Erreur création challenge:', error);
            return {
                success: false,
                error: 'Erreur lors de la création du challenge'
            };
        }
    }

    // ========== GÉNÉRATION D'OCCURRENCES ==========
    generateOccurrences(startDate, duration, frequency, customDays = []) {
        const occurrences = [];
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        for (let i = 0; i < duration; i++) {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            const dayOfWeek = date.getDay();

            let shouldInclude = false;

            if (frequency === 'daily') {
                shouldInclude = true;
            } else if (frequency === 'custom' && customDays.includes(dayOfWeek)) {
                shouldInclude = true;
            }

            if (shouldInclude) {
                occurrences.push({
                    id: `${date.getTime()}_${occurrences.length}`,
                    date: date.toISOString(),
                    dayOfWeek: dayOfWeek,
                    checked: false,
                    required: true,
                    check_time: null,
                    notes: '',
                    proof_url: null
                });
            }
        }

        return occurrences;
    }

    // ========== CHARGEMENT DES CHALLENGES ==========
    async loadUserChallenges(userId) {
        try {
            const result = await database.getChallengesByUser(userId);
            
            if (result.success) {
                this.challenges = result.data;
                this.updateChallengeStatuses();
                return {
                    success: true,
                    data: this.challenges
                };
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Erreur chargement challenges:', error);
            return {
                success: false,
                error: 'Erreur lors du chargement des challenges'
            };
        }
    }

    // ========== MISE À JOUR STATUTS ==========
    updateChallengeStatuses() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        this.challenges.forEach(challenge => {
            if (challenge.status === 'active') {
                const endDate = new Date(challenge.end_date);
                endDate.setHours(0, 0, 0, 0);

                // Vérifier si le challenge est terminé
                if (today > endDate) {
                    const allCompleted = challenge.occurrences?.every(o => o.checked) || false;
                    challenge.status = allCompleted ? 'completed' : 'failed';
                    
                    // Mettre à jour en base (async)
                    this.updateChallengeStatus(challenge.id, challenge.status);
                }

                // Mettre à jour les métriques
                this.updateChallengeMetrics(challenge);
            }
        });
    }

    async updateChallengeStatus(challengeId, status) {
        try {
            await database.updateChallenge(challengeId, { status });
        } catch (error) {
            console.error('❌ Erreur mise à jour statut:', error);
        }
    }

    // ========== MÉTRIQUES CHALLENGE ==========
    updateChallengeMetrics(challenge) {
        if (!challenge.occurrences) return;

        // Calcul du taux de complétion
        const totalOccurrences = challenge.occurrences.length;
        const completedOccurrences = challenge.occurrences.filter(o => o.checked).length;
        challenge.completion_rate = totalOccurrences > 0 ? 
            Math.round((completedOccurrences / totalOccurrences) * 100) : 0;

        // Calcul du streak actuel
        challenge.current_streak = this.calculateStreak(challenge);

        // Calcul des points gagnés
        challenge.points_earned = this.calculatePointsEarned(challenge);
    }

    // ========== CALCUL STREAK ==========
    calculateStreak(challenge) {
        const cacheKey = `${challenge.id}_${challenge.occurrences?.length || 0}`;
        
        if (this.streakCalculationCache.has(cacheKey)) {
            return this.streakCalculationCache.get(cacheKey);
        }

        if (!challenge.occurrences) {
            this.streakCalculationCache.set(cacheKey, 0);
            return 0;
        }

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Trier les occurrences par date décroissante
        const sortedOccurrences = [...challenge.occurrences]
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        // Compter les occurrences consécutives réussies
        for (let occurrence of sortedOccurrences) {
            const occDate = new Date(occurrence.date);
            occDate.setHours(0, 0, 0, 0);

            // Ne compter que les occurrences passées ou d'aujourd'hui
            if (occDate <= today) {
                if (occurrence.checked) {
                    streak++;
                } else {
                    break; // Le streak est cassé
                }
            }
        }

        this.streakCalculationCache.set(cacheKey, streak);
        return streak;
    }

    // ========== CALCUL POINTS ==========
    calculatePointsEarned(challenge) {
        if (!challenge.occurrences) return 0;

        let points = 0;
        const completedCount = challenge.occurrences.filter(o => o.checked).length;
        
        // Points de base pour les check-ins
        points += completedCount * 5;
        
        // Bonus de streak
        const streakBonuses = Math.floor(challenge.current_streak / 7) * 20;
        points += streakBonuses;
        
        // Bonus de complétion
        if (challenge.status === 'completed') {
            points += 50;
        }
        
        return points;
    }

    // ========== CHECK-IN ==========
    async checkIn(challengeId, notes = '', proofFile = null) {
        try {
            const challenge = this.challenges.find(c => c.id === challengeId);
            if (!challenge || !challenge.occurrences) {
                return { success: false, error: 'Challenge non trouvé' };
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Trouver l'occurrence d'aujourd'hui
            const todayOccurrence = challenge.occurrences.find(o => {
                const oDate = new Date(o.date);
                oDate.setHours(0, 0, 0, 0);
                return oDate.getTime() === today.getTime();
            });

            if (!todayOccurrence) {
                return { success: false, error: 'Aucun check-in prévu aujourd\'hui' };
            }

            if (todayOccurrence.checked) {
                return { success: false, error: 'Check-in déjà fait aujourd\'hui' };
            }

            // Upload de la preuve si fournie
            let proofUrl = null;
            if (proofFile) {
                const uploadResult = await this.uploadProof(challengeId, proofFile);
                if (uploadResult.success) {
                    proofUrl = uploadResult.url;
                }
            }

            // Marquer comme complété
            todayOccurrence.checked = true;
            todayOccurrence.check_time = new Date().toISOString();
            todayOccurrence.notes = notes;
            todayOccurrence.proof_url = proofUrl;

            // Recalculer les métriques
            this.updateChallengeMetrics(challenge);

            // Mettre à jour en base
            const updateResult = await database.updateChallenge(challengeId, {
                occurrences: challenge.occurrences,
                current_streak: challenge.current_streak,
                completion_rate: challenge.completion_rate,
                points_earned: challenge.points_earned
            });

            if (!updateResult.success) {
                return updateResult;
            }

            // Créer l'entrée de check-in
            const checkInResult = await database.createCheckIn({
                user_id: challenge.user_id,
                challenge_id: challengeId,
                occurrence_id: todayOccurrence.id,
                checked_at: todayOccurrence.check_time,
                notes: notes,
                proof_url: proofUrl
            });

            // Calcul des points gagnés
            let pointsGained = 5;
            let bonusMessage = '';

            // Bonus de streak hebdomadaire
            if (challenge.current_streak > 0 && challenge.current_streak % 7 === 0) {
                pointsGained += 20;
                bonusMessage = ` Série de ${challenge.current_streak} jours ! 🔥`;
            }

            // Vérifier si le challenge est complété
            const allCompleted = challenge.occurrences.every(o => o.checked);
            if (allCompleted && challenge.status === 'active') {
                challenge.status = 'completed';
                pointsGained += 50;
                bonusMessage += ' Challenge complété ! 🏆';
                
                await database.updateChallenge(challengeId, { status: 'completed' });
                await this.notifyWitness(challenge, 'challenge_completed');
                
                // Envoyer email témoin de complétion
                await emailService.notifyChallengeCompleted(challenge, challenge.witness_email);
            }

            // Notification de réussite
            await database.createNotification({
                user_id: challenge.user_id,
                type: 'checkin_success',
                title: 'Check-in validé ! ✅',
                message: `+${pointsGained} points pour "${challenge.title}".${bonusMessage}`,
                read: false
            });

            return {
                success: true,
                data: {
                    pointsGained,
                    streak: challenge.current_streak,
                    completed: allCompleted,
                    message: `Check-in validé ! +${pointsGained} points${bonusMessage}`
                }
            };

        } catch (error) {
            console.error('❌ Erreur check-in:', error);
            return {
                success: false,
                error: 'Erreur lors du check-in'
            };
        }
    }

    // ========== UPLOAD PREUVE ==========
    async uploadProof(challengeId, file) {
        try {
            // Validation du fichier
            const validation = Validators.validateFile(file, {
                maxSize: 5 * 1024 * 1024, // 5MB
                allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
            });

            if (!validation.valid) {
                return { success: false, error: validation.message };
            }

            // Générer nom unique
            const fileName = `challenge_${challengeId}_${Date.now()}_${file.name}`;
            const filePath = `proofs/${fileName}`;

            // Upload vers Supabase Storage
            const uploadResult = await database.uploadFile('challenge-proofs', filePath, file);
            
            if (!uploadResult.success) {
                return uploadResult;
            }

            // Récupérer l'URL publique
            const urlResult = database.getPublicUrl('challenge-proofs', filePath);
            
            if (!urlResult.success) {
                return urlResult;
            }

            return {
                success: true,
                url: urlResult.url,
                path: filePath
            };

        } catch (error) {
            console.error('❌ Erreur upload preuve:', error);
            return {
                success: false,
                error: 'Erreur lors de l\'upload de la preuve'
            };
        }
    }

    // ========== SUPPRESSION CHALLENGE ==========
    async deleteChallenge(challengeId) {
        try {
            const result = await database.deleteChallenge(challengeId);
            
            if (result.success) {
                this.challenges = this.challenges.filter(c => c.id !== challengeId);
                return { success: true, message: 'Challenge supprimé' };
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Erreur suppression challenge:', error);
            return {
                success: false,
                error: 'Erreur lors de la suppression'
            };
        }
    }

    // ========== NOTIFICATIONS TÉMOIN ==========
    async notifyWitness(challenge, type) {
        try {
            // Note: Ici on pourrait intégrer EmailJS ou un service email
            console.log(`📧 Notification témoin ${type} pour:`, challenge.witness_email);
            
            // Pour l'instant, on simule l'envoi
            const emailData = {
                to: challenge.witness_email,
                type: type,
                challengeTitle: challenge.title,
                userEmail: challenge.user_email || 'Utilisateur',
                challengeUrl: `${window.location.origin}/witness/${challenge.id}`
            };

            // TODO: Implémenter vraie logique d'email
            return { success: true, data: emailData };
            
        } catch (error) {
            console.error('❌ Erreur notification témoin:', error);
            return { success: false, error: error.message };
        }
    }

    // ========== STATISTIQUES ==========
    getChallengeStats(challenges = this.challenges) {
        const stats = {
            total: challenges.length,
            active: challenges.filter(c => c.status === 'active').length,
            completed: challenges.filter(c => c.status === 'completed').length,
            failed: challenges.filter(c => c.status === 'failed').length,
            totalPoints: challenges.reduce((sum, c) => sum + (c.points_earned || 0), 0),
            maxStreak: Math.max(...challenges.map(c => c.current_streak || 0), 0),
            avgCompletionRate: 0
        };

        // Taux de complétion moyen
        if (stats.total > 0) {
            const totalRate = challenges.reduce((sum, c) => sum + (c.completion_rate || 0), 0);
            stats.avgCompletionRate = Math.round(totalRate / stats.total);
        }

        return stats;
    }

    // ========== UTILITAIRES ==========
    getUserTimezone() {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('fr-FR', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });
    }

    // ========== DASHBOARD LOADING ==========
    async loadDashboard() {
        try {
            const session = await database.getCurrentSession();
            if (!session.success || !session.session) {
                console.warn('⚠️ Pas de session pour charger le dashboard');
                return { success: false, error: 'Non connecté' };
            }

            const userId = session.session.user.id;
            const result = await this.loadUserChallenges(userId);
            
            if (result.success) {
                console.log('✅ Dashboard chargé:', result.data.length, 'challenges');
                
                // Mettre à jour l'UI si disponible
                if (window.uiManager && window.uiManager.updateDashboard) {
                    window.uiManager.updateDashboard(result.data);
                }
            }
            
            return result;
        } catch (error) {
            console.error('❌ Erreur loadDashboard:', error);
            return { success: false, error: error.message };
        }
    }

    // ========== GETTERS ==========
    getAllChallenges() {
        return this.challenges;
    }

    getActiveChallenges() {
        return this.challenges.filter(c => c.status === 'active');
    }

    getChallengeById(id) {
        return this.challenges.find(c => c.id === id);
    }

    getCurrentChallenge() {
        return this.currentChallenge;
    }

    setCurrentChallenge(challenge) {
        this.currentChallenge = challenge;
    }
}

// Instance singleton
const challengeManager = new ChallengeManager();

export default challengeManager;