// Système de badges et gamification avancé
export class BadgeManager {
    constructor() {
        this.availableBadges = this.initializeBadges();
        this.userBadges = [];
    }

    // ========== INITIALISATION DES BADGES ==========
    initializeBadges() {
        return {
            // Badges de début
            'first_challenge': {
                id: 'first_challenge',
                name: 'Premier Pas',
                description: 'Créé ton premier challenge',
                icon: '🎯',
                type: 'starter',
                points: 10,
                condition: (user, stats) => stats.challenges_created >= 1
            },
            
            'first_checkin': {
                id: 'first_checkin',
                name: 'Première Victoire',
                description: 'Effectué ton premier check-in',
                icon: '✅',
                type: 'starter',
                points: 5,
                condition: (user, stats) => stats.total_checkins >= 1
            },

            // Badges de streak
            'week_streak': {
                id: 'week_streak',
                name: 'Première Semaine',
                description: '7 jours consécutifs de check-ins',
                icon: '🔥',
                type: 'streak',
                points: 50,
                condition: (user, stats) => stats.longest_streak >= 7
            },

            'month_streak': {
                id: 'month_streak',
                name: 'Marathonien',
                description: '30 jours consécutifs de check-ins',
                icon: '🏃‍♂️',
                type: 'streak',
                points: 200,
                condition: (user, stats) => stats.longest_streak >= 30
            },

            'legend_streak': {
                id: 'legend_streak',
                name: 'Légende',
                description: '100 jours consécutifs de check-ins',
                icon: '👑',
                type: 'streak',
                points: 2000,
                rarity: 'legendary',
                condition: (user, stats) => stats.longest_streak >= 100
            },

            // Badges avancés selon PROMPT_EXPERT_FINALIZATION
            'first_witness': {
                id: 'first_witness',
                name: 'Témoin Fidèle',
                description: 'Premier challenge comme témoin',
                icon: '👁️',
                type: 'social',
                points: 100,
                condition: (user, stats) => (user.witness_count || 0) >= 1
            },

            // Badges de performance
            'perfectionist': {
                id: 'perfectionist',
                name: 'Perfectionniste',
                description: '0 échecs sur 30 jours',
                icon: '💎',
                type: 'performance',
                points: 150,
                condition: (user, stats, challenges) => {
                    const recent30Days = this.getRecentChallenges(challenges, 30);
                    return recent30Days.length > 0 && recent30Days.every(c => c.completion_rate === 100);
                }
            },

            'overachiever': {
                id: 'overachiever',
                name: 'Surpassement',
                description: 'Complété 10 challenges',
                icon: '🚀',
                type: 'achievement',
                points: 300,
                condition: (user, stats) => stats.challenges_completed >= 10
            },

            'consistency_master': {
                id: 'consistency_master',
                name: 'Maître de la Régularité',
                description: 'Check-in quotidien pendant 2 semaines',
                icon: '⚡',
                type: 'consistency',
                points: 100,
                condition: (user, stats) => {
                    // Vérifier les 14 derniers jours
                    return this.hasConsistentCheckins(user.id, 14);
                }
            },

            // Badges sociaux
            'mentor': {
                id: 'mentor',
                name: 'Mentor',
                description: 'Témoin de 5+ challenges différents',
                icon: '🧙‍♂️',
                type: 'social',
                points: 1000,
                rarity: 'epic',
                condition: (user, stats) => (user.witness_count || 0) >= 5
            },

            'influencer': {
                id: 'influencer',
                name: 'Influenceur',
                description: 'Témoin de 20+ challenges',
                icon: '🌟',
                type: 'social',
                points: 500,
                rarity: 'epic',
                condition: (user, stats) => (user.witness_count || 0) >= 20
            },

            // Badges spéciaux
            'early_bird': {
                id: 'early_bird',
                name: 'Lève-tôt',
                description: 'Check-ins avant 8h pendant 7 jours',
                icon: '🌅',
                type: 'special',
                points: 75,
                condition: async (user, stats) => {
                    return await this.checkEarlyBirdPattern(user.id);
                }
            },

            'night_owl': {
                id: 'night_owl',
                name: 'Oiseau de Nuit',
                description: 'Check-ins après 22h pendant 7 jours',
                icon: '🦉',
                type: 'special',
                points: 75,
                condition: async (user, stats) => {
                    return await this.checkNightOwlPattern(user.id);
                }
            },

            'weekend_warrior': {
                id: 'weekend_warrior',
                name: 'Guerrier du Week-end',
                description: 'Check-ins tous les week-ends pendant 1 mois',
                icon: '⚔️',
                type: 'special',
                points: 150,
                condition: async (user, stats) => {
                    return await this.checkWeekendPattern(user.id);
                }
            },

            // Badges de niveau
            'bronze_level': {
                id: 'bronze_level',
                name: 'Bronze',
                description: 'Atteint 100 points',
                icon: '🥉',
                type: 'level',
                points: 0,
                condition: (user, stats) => user.points >= 100
            },

            'silver_level': {
                id: 'silver_level',
                name: 'Argent',
                description: 'Atteint 500 points',
                icon: '🥈',
                type: 'level',
                points: 0,
                rarity: 'rare',
                condition: (user, stats) => user.points >= 500
            },

            'gold_level': {
                id: 'gold_level',
                name: 'Or',
                description: 'Atteint 1000 points',
                icon: '🥇',
                type: 'level',
                points: 0,
                rarity: 'epic',
                condition: (user, stats) => user.points >= 1000
            },

            'platinum_level': {
                id: 'platinum_level',
                name: 'Platine',
                description: 'Atteint 2500 points',
                icon: '💍',
                type: 'level',
                points: 0,
                rarity: 'legendary',
                condition: (user, stats) => user.points >= 2500
            }
        };
    }

    // ========== VÉRIFICATION DES BADGES ==========
    async checkForNewBadges(user, stats, challenges) {
        const newBadges = [];
        const currentBadgeIds = user.badges?.map(b => b.id) || [];

        for (const [badgeId, badge] of Object.entries(this.availableBadges)) {
            // Ignorer les badges déjà obtenus
            if (currentBadgeIds.includes(badgeId)) {
                continue;
            }

            try {
                // Vérifier la condition
                const earned = await badge.condition(user, stats, challenges);
                
                if (earned) {
                    const earnedBadge = {
                        ...badge,
                        earnedAt: new Date().toISOString(),
                        progress: 100
                    };
                    
                    newBadges.push(earnedBadge);
                    
                    // Notification de badge gagné
                    this.notifyBadgeEarned(earnedBadge);
                }
            } catch (error) {
                console.error(`❌ Erreur vérification badge ${badgeId}:`, error);
            }
        }

        return newBadges;
    }

    // ========== NOTIFICATIONS ==========
    notifyBadgeEarned(badge) {
        if (typeof window !== 'undefined' && window.uiManager) {
            const rarityColors = {
                common: '#10b981',
                rare: '#3b82f6',
                epic: '#8b5cf6',
                legendary: '#f59e0b'
            };

            window.uiManager.showNotification(
                `Nouveau badge débloqué : ${badge.name} ${badge.icon}`,
                'success',
                {
                    title: '🏆 Badge Débloqué !',
                    duration: 8000,
                    style: {
                        borderColor: rarityColors[badge.rarity || 'common']
                    }
                }
            );
        }
    }

    // ========== CALCUL PROGRESSION ==========
    getBadgeProgress(badgeId, user, stats, challenges) {
        const badge = this.availableBadges[badgeId];
        if (!badge) return { progress: 0, total: 100 };

        // Calculer la progression selon le type de badge
        switch (badge.type) {
            case 'streak':
                if (badgeId === 'week_streak') {
                    return { progress: Math.min(stats.current_streak, 7), total: 7 };
                }
                if (badgeId === 'month_streak') {
                    return { progress: Math.min(stats.current_streak, 30), total: 30 };
                }
                if (badgeId === 'legend_streak') {
                    return { progress: Math.min(stats.current_streak, 100), total: 100 };
                }
                break;

            case 'achievement':
                if (badgeId === 'overachiever') {
                    return { progress: Math.min(stats.challenges_completed, 10), total: 10 };
                }
                break;

            case 'level':
                const levelThresholds = {
                    'bronze_level': 100,
                    'silver_level': 500,
                    'gold_level': 1000,
                    'platinum_level': 2500
                };
                const threshold = levelThresholds[badgeId];
                return { progress: Math.min(user.points, threshold), total: threshold };

            case 'social':
                if (badgeId === 'mentor') {
                    const count = user.witness_count || 0;
                    return { progress: Math.min(count, 5), total: 5 };
                }
                if (badgeId === 'influencer') {
                    const count = user.witness_count || 0;
                    return { progress: Math.min(count, 20), total: 20 };
                }
                break;
        }

        return { progress: 0, total: 100 };
    }

    // ========== UTILITAIRES ==========
    getRecentChallenges(challenges, days) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        
        return challenges.filter(challenge => {
            const challengeDate = new Date(challenge.created_at);
            return challengeDate >= cutoff;
        });
    }

    async hasConsistentCheckins(userId, days) {
        // Simuler la vérification - à implémenter avec vraie DB
        return true;
    }

    async checkEarlyBirdPattern(userId) {
        // Vérifier les check-ins avant 8h
        return false;
    }

    async checkNightOwlPattern(userId) {
        // Vérifier les check-ins après 22h
        return false;
    }

    async checkWeekendPattern(userId) {
        // Vérifier les check-ins de week-end
        return false;
    }

    // ========== AFFICHAGE ==========
    getBadgesByType(type) {
        return Object.values(this.availableBadges).filter(badge => badge.type === type);
    }

    getBadgesByRarity(rarity) {
        return Object.values(this.availableBadges).filter(badge => badge.rarity === rarity);
    }

    getBadgeHTML(badge, earned = false, progress = null) {
        const rarityClass = badge.rarity ? `rarity-${badge.rarity}` : 'rarity-common';
        const earnedClass = earned ? 'earned' : 'locked';
        
        let progressBar = '';
        if (progress && !earned) {
            const percentage = (progress.progress / progress.total) * 100;
            progressBar = `
                <div class="badge-progress">
                    <div class="badge-progress-bar" style="width: ${percentage}%"></div>
                    <span class="badge-progress-text">${progress.progress}/${progress.total}</span>
                </div>
            `;
        }

        return `
            <div class="badge-card ${rarityClass} ${earnedClass}">
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-info">
                    <h4 class="badge-name">${badge.name}</h4>
                    <p class="badge-description">${badge.description}</p>
                    ${badge.points > 0 ? `<div class="badge-points">+${badge.points} points</div>` : ''}
                    ${progressBar}
                </div>
                ${earned ? `<div class="badge-earned">✓</div>` : ''}
            </div>
        `;
    }

    // ========== STATISTIQUES ==========
    getUserBadgeStats(userBadges) {
        const stats = {
            total: userBadges.length,
            byType: {},
            byRarity: {},
            totalPoints: 0
        };

        userBadges.forEach(badge => {
            // Par type
            stats.byType[badge.type] = (stats.byType[badge.type] || 0) + 1;
            
            // Par rareté
            const rarity = badge.rarity || 'common';
            stats.byRarity[rarity] = (stats.byRarity[rarity] || 0) + 1;
            
            // Points totaux
            stats.totalPoints += badge.points || 0;
        });

        return stats;
    }
}

// Styles CSS pour les badges
export const badgeStyles = `
.badge-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: 8px;
    border: 2px solid transparent;
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: all 0.3s ease;
    position: relative;
}

.badge-card.earned {
    border-color: #10b981;
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
}

.badge-card.locked {
    opacity: 0.6;
    background: #f9fafb;
}

.badge-card.rarity-rare {
    border-color: #3b82f6;
    background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%);
}

.badge-card.rarity-epic {
    border-color: #8b5cf6;
    background: linear-gradient(135deg, #f5f3ff 0%, #faf5ff 100%);
}

.badge-card.rarity-legendary {
    border-color: #f59e0b;
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.3);
}

.badge-icon {
    font-size: 32px;
    flex-shrink: 0;
}

.badge-info {
    flex: 1;
}

.badge-name {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 4px 0;
    color: #1f2937;
}

.badge-description {
    font-size: 14px;
    color: #6b7280;
    margin: 0 0 8px 0;
}

.badge-points {
    font-size: 12px;
    font-weight: 600;
    color: #059669;
    background: #d1fae5;
    padding: 2px 6px;
    border-radius: 12px;
    display: inline-block;
}

.badge-progress {
    margin-top: 8px;
    position: relative;
}

.badge-progress-bar {
    height: 4px;
    background: #10b981;
    border-radius: 2px;
    transition: width 0.3s ease;
}

.badge-progress-text {
    position: absolute;
    right: 0;
    top: -20px;
    font-size: 11px;
    color: #6b7280;
}

.badge-earned {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 24px;
    height: 24px;
    background: #10b981;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
}

.badges-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 16px;
    margin: 20px 0;
}

.badge-category {
    margin: 30px 0;
}

.badge-category h3 {
    color: #1f2937;
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.badge-stats {
    display: flex;
    gap: 20px;
    margin: 20px 0;
    flex-wrap: wrap;
}

.badge-stat {
    background: white;
    padding: 12px 16px;
    border-radius: 8px;
    border-left: 4px solid #6366f1;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    text-align: center;
}

.badge-stat-value {
    font-size: 24px;
    font-weight: bold;
    color: #1f2937;
}

.badge-stat-label {
    font-size: 12px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
`;

// Injecter les styles
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = badgeStyles;
    document.head.appendChild(styleSheet);
}

// Instance singleton
const badgeManager = new BadgeManager();

export default badgeManager;