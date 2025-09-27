// Module Analytics Dashboard - Chart.js Integration
import database from './database.js';

export class AnalyticsManager {
    constructor() {
        this.charts = new Map();
        this.isInitialized = false;
        this.chartColors = {
            primary: '#6366f1',
            success: '#10b981', 
            warning: '#f59e0b',
            danger: '#ef4444',
            secondary: '#6b7280',
            light: '#f9fafb'
        };
    }

    // ========== INITIALISATION ==========
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Charger Chart.js si pas déjà fait
            if (typeof Chart === 'undefined') {
                await this.loadChartJS();
            }
            
            this.isInitialized = true;
            console.log('✅ AnalyticsManager initialisé');
        } catch (error) {
            console.error('❌ Erreur initialisation analytics:', error);
        }
    }

    async loadChartJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // ========== GRAPHIQUES PRINCIPAUX ==========
    
    /**
     * Génère le graphique de progression pour un utilisateur
     */
    async generateProgressChart(userId, timeframe = 'month', containerId = 'progressChart') {
        try {
            const data = await this.getProgressData(userId, timeframe);
            const container = document.getElementById(containerId);
            
            if (!container) {
                console.warn(`Container ${containerId} not found`);
                return null;
            }

            // Détruire le graphique existant si présent
            if (this.charts.has(containerId)) {
                this.charts.get(containerId).destroy();
            }

            const ctx = container.getContext('2d');
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.labels,
                    datasets: [
                        {
                            label: 'Check-ins quotidiens',
                            data: data.checkins,
                            borderColor: this.chartColors.primary,
                            backgroundColor: this.chartColors.primary + '20',
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Points gagnés',
                            data: data.points,
                            borderColor: this.chartColors.success,
                            backgroundColor: this.chartColors.success + '20',
                            fill: false,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Check-ins'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Points'
                            },
                            grid: {
                                drawOnChartArea: false,
                            },
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: `Progression - ${timeframe === 'month' ? 'Ce mois' : 'Cette semaine'}`
                        },
                        legend: {
                            position: 'top'
                        }
                    }
                }
            });

            this.charts.set(containerId, chart);
            return chart;

        } catch (error) {
            console.error('❌ Erreur génération graphique progression:', error);
            return null;
        }
    }

    /**
     * Génère le graphique de répartition des challenges
     */
    async generateChallengeDistributionChart(userId, containerId = 'distributionChart') {
        try {
            const data = await this.getChallengeDistributionData(userId);
            const container = document.getElementById(containerId);
            
            if (!container) return null;

            if (this.charts.has(containerId)) {
                this.charts.get(containerId).destroy();
            }

            const ctx = container.getContext('2d');
            const chart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Actifs', 'Complétés', 'Échoués', 'En pause'],
                    datasets: [{
                        data: [data.active, data.completed, data.failed, data.paused],
                        backgroundColor: [
                            this.chartColors.primary,
                            this.chartColors.success,
                            this.chartColors.danger,
                            this.chartColors.secondary
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Répartition des Challenges'
                        },
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });

            this.charts.set(containerId, chart);
            return chart;

        } catch (error) {
            console.error('❌ Erreur génération graphique distribution:', error);
            return null;
        }
    }

    /**
     * Génère le graphique des streaks
     */
    async generateStreakChart(userId, containerId = 'streakChart') {
        try {
            const data = await this.getStreakData(userId);
            const container = document.getElementById(containerId);
            
            if (!container) return null;

            if (this.charts.has(containerId)) {
                this.charts.get(containerId).destroy();
            }

            const ctx = container.getContext('2d');
            const chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Longueur du Streak',
                        data: data.streaks,
                        backgroundColor: data.streaks.map(value => 
                            value >= 30 ? this.chartColors.success :
                            value >= 7 ? this.chartColors.primary : 
                            this.chartColors.warning
                        ),
                        borderRadius: 8,
                        borderSkipped: false,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Jours consécutifs'
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Historique des Streaks'
                        }
                    }
                }
            });

            this.charts.set(containerId, chart);
            return chart;

        } catch (error) {
            console.error('❌ Erreur génération graphique streak:', error);
            return null;
        }
    }

    // ========== RÉCUPÉRATION DES DONNÉES ==========
    
    async getProgressData(userId, timeframe) {
        try {
            const endDate = new Date();
            const startDate = new Date();
            
            if (timeframe === 'month') {
                startDate.setMonth(startDate.getMonth() - 1);
            } else {
                startDate.setDate(startDate.getDate() - 7);
            }

            const result = await database.getUserAnalytics(userId, startDate, endDate);
            
            if (!result.success) {
                throw new Error(result.error);
            }

            // Traiter les données pour le graphique
            const days = timeframe === 'month' ? 30 : 7;
            const labels = [];
            const checkins = [];
            const points = [];

            for (let i = days - 1; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                labels.push(date.toLocaleDateString('fr-FR', { 
                    month: 'short', 
                    day: 'numeric' 
                }));

                // Chercher les données pour cette date
                const dayData = result.data.daily_stats.find(stat => 
                    new Date(stat.date).toDateString() === date.toDateString()
                );

                checkins.push(dayData ? dayData.checkins : 0);
                points.push(dayData ? dayData.points : 0);
            }

            return { labels, checkins, points };

        } catch (error) {
            console.error('❌ Erreur récupération données progression:', error);
            // Données par défaut en cas d'erreur
            return {
                labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
                checkins: [1, 0, 1, 1, 0, 1, 1],
                points: [10, 0, 15, 10, 0, 20, 15]
            };
        }
    }

    async getChallengeDistributionData(userId) {
        try {
            const result = await database.getChallengeStats(userId);
            
            if (!result.success) {
                throw new Error(result.error);
            }

            return {
                active: result.data.active || 0,
                completed: result.data.completed || 0,
                failed: result.data.failed || 0,
                paused: result.data.paused || 0
            };

        } catch (error) {
            console.error('❌ Erreur récupération distribution challenges:', error);
            return { active: 2, completed: 5, failed: 1, paused: 0 };
        }
    }

    async getStreakData(userId) {
        try {
            const result = await database.getStreakHistory(userId);
            
            if (!result.success) {
                throw new Error(result.error);
            }

            // Traiter les données des streaks
            const streakHistory = result.data.streak_history || [];
            const labels = [];
            const streaks = [];

            streakHistory.forEach((streak, index) => {
                labels.push(`Streak ${index + 1}`);
                streaks.push(streak.length);
            });

            // Si pas de données, afficher des données d'exemple
            if (labels.length === 0) {
                return {
                    labels: ['Actuel'],
                    streaks: [result.data.current_streak || 0]
                };
            }

            return { labels, streaks };

        } catch (error) {
            console.error('❌ Erreur récupération données streak:', error);
            return { labels: ['Actuel'], streaks: [5] };
        }
    }

    // ========== COMPARAISON ET RAPPORTS ==========
    
    async generateComparisonReport(userId) {
        try {
            const userStats = await database.getUserStats(userId);
            const globalStats = await database.getGlobalStats();
            
            if (!userStats.success || !globalStats.success) {
                throw new Error('Erreur récupération statistiques');
            }

            const user = userStats.data;
            const global = globalStats.data;

            return {
                user: {
                    challenges_completed: user.challenges_completed || 0,
                    current_streak: user.current_streak || 0,
                    total_points: user.total_points || 0,
                    success_rate: user.success_rate || 0
                },
                global: {
                    avg_challenges: Math.round(global.avg_challenges_per_user || 0),
                    avg_streak: Math.round(global.avg_current_streak || 0),
                    avg_points: Math.round(global.avg_points_per_user || 0),
                    avg_success_rate: Math.round(global.avg_success_rate || 0)
                },
                percentiles: {
                    challenges: this.calculatePercentile(user.challenges_completed, global.challenges_percentiles),
                    streak: this.calculatePercentile(user.current_streak, global.streak_percentiles),
                    points: this.calculatePercentile(user.total_points, global.points_percentiles)
                }
            };

        } catch (error) {
            console.error('❌ Erreur génération rapport comparaison:', error);
            return null;
        }
    }

    calculatePercentile(userValue, percentiles) {
        if (!percentiles || !userValue) return 0;
        
        for (let i = 100; i >= 0; i -= 5) {
            if (userValue >= percentiles[i]) {
                return i;
            }
        }
        return 0;
    }

    // ========== EXPORT DE DONNÉES ==========
    
    async exportUserData(userId, format = 'json') {
        try {
            const userData = await database.getAllUserData(userId);
            
            if (!userData.success) {
                throw new Error(userData.error);
            }

            const data = userData.data;
            
            switch (format.toLowerCase()) {
                case 'json':
                    return this.exportAsJSON(data);
                case 'csv':
                    return this.exportAsCSV(data);
                case 'pdf':
                    return this.exportAsPDF(data);
                default:
                    throw new Error(`Format ${format} non supporté`);
            }

        } catch (error) {
            console.error('❌ Erreur export données utilisateur:', error);
            return null;
        }
    }

    exportAsJSON(data) {
        const exportData = {
            user_profile: data.profile,
            challenges: data.challenges,
            check_ins: data.checkins,
            badges: data.badges,
            statistics: data.stats,
            export_date: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
            type: 'application/json' 
        });
        return this.downloadFile(blob, 'motiveme-data.json');
    }

    exportAsCSV(data) {
        const challenges = data.challenges || [];
        let csvContent = 'Challenge,Start Date,End Date,Status,Completion Rate,Points\n';
        
        challenges.forEach(challenge => {
            csvContent += `"${challenge.title}","${challenge.start_date}","${challenge.end_date}","${challenge.status}","${challenge.completion_rate}%","${challenge.points_earned}"\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv' });
        return this.downloadFile(blob, 'motiveme-challenges.csv');
    }

    exportAsPDF(data) {
        // Pour PDF, utiliser une librairie comme jsPDF
        console.log('Export PDF à implémenter avec jsPDF');
        // TODO: Implémenter export PDF
        return null;
    }

    downloadFile(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return true;
    }

    // ========== MÉTHODES UTILITAIRES ==========
    
    /**
     * Initialise tous les graphiques pour une page analytics
     */
    async initializeAnalyticsDashboard(userId) {
        await this.initialize();
        
        // Attendre que les containers soient prêts
        setTimeout(async () => {
            await this.generateProgressChart(userId, 'month');
            await this.generateChallengeDistributionChart(userId);
            await this.generateStreakChart(userId);
        }, 100);
    }

    /**
     * Met à jour tous les graphiques avec de nouvelles données
     */
    async refreshAllCharts(userId) {
        for (const [containerId, chart] of this.charts) {
            chart.destroy();
        }
        this.charts.clear();
        
        await this.initializeAnalyticsDashboard(userId);
    }

    /**
     * Nettoie tous les graphiques
     */
    destroy() {
        for (const chart of this.charts.values()) {
            chart.destroy();
        }
        this.charts.clear();
        this.isInitialized = false;
    }
}

// Export par défaut
const analyticsManager = new AnalyticsManager();
export default analyticsManager;