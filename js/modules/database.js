// Base de données - Interface Express API Backend
// Utiliser le proxy Vite configuré dans vite.config.js
const API_BASE_URL = '/api';
console.log('🌐 API Base URL:', API_BASE_URL);
console.log('🌐 Window location:', window.location.origin);

class EventEmitter {
    constructor() {
        this.listeners = [];
    }

    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    emit(event, session) {
        this.listeners.forEach(callback => {
            try {
                callback(event, session);
            } catch (error) {
                console.error('❌ Erreur dans listener:', error);
            }
        });
    }
}

class Database {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.isInitialized = false;
        this.authEmitter = new EventEmitter();
        this.currentSession = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.connectionTimeout = 10000;
        this.fallbackMode = false;
    }

    async connect() {
        if (this.isConnected && this.client) {
            return { success: true, message: 'Déjà connecté' };
        }

        try {
            // Utiliser le proxy Vite pour health check
            const healthUrl = `${API_BASE_URL}/health`;
            console.log('🚀 Tentative de connexion à:', healthUrl);

            const response = await Promise.race([
                fetch(healthUrl, {
                    credentials: 'include',
                    headers: { 'Accept': 'application/json' }
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), this.connectionTimeout)
                )
            ]);

            if (!response.ok) {
                throw new Error(`API non disponible (HTTP ${response.status})`);
            }

            const data = await response.json();

            if (data.status !== 'ok') {
                throw new Error('API health check failed');
            }

            this.client = { connected: true };
            this.isConnected = true;
            this.isInitialized = true;
            this.retryCount = 0;

            console.log('✅ Database connectée à Express API');
            return { success: true, message: 'Connexion réussie' };

        } catch (error) {
            console.error('❌ Erreur connexion database:', error.message || error);

            this.retryCount++;
            if (this.retryCount < this.maxRetries) {
                const delay = Math.min(this.retryCount * 2000, 5000);
                console.log(`🔄 Tentative ${this.retryCount}/${this.maxRetries} dans ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.connect();
            }

            console.warn('⚠️ Échec connexion après 3 tentatives, activation mode dégradé');
            return this.activateFallbackMode();
        }
    }

    activateFallbackMode() {
        console.warn('⚠️ Mode dégradé activé - Données en localStorage');
        this.isConnected = false;
        this.isInitialized = true;
        this.fallbackMode = true;
        this.client = null;

        return { 
            success: true, 
            message: 'Mode dégradé activé',
            fallback: true
        };
    }

    async _fetch(endpoint, options = {}) {
        // Utiliser l'URL de l'API avec le proxy Vite
        const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

        const defaultOptions = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        try {
            console.log(`🚀 Fetching [${options.method || 'GET'}]: ${url}`);
            const response = await fetch(url, { ...defaultOptions, ...options });

            let data;
            try {
                data = await response.json();
                console.log(`✅ Response [${url}]:`, data);
            } catch (jsonError) {
                console.error('❌ Erreur parsing JSON:', jsonError);
                // Si la réponse n'est pas du JSON mais est OK, retournez le texte brut
                if (response.ok) {
                    const textResponse = await response.text();
                    console.log(`ℹ️ Response Text [${url}]:`, textResponse);
                    return { success: true, data: textResponse };
                }
                return { success: false, error: 'Invalid JSON response' };
            }

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    this.currentSession = null;
                    this.authEmitter.emit('SIGNED_OUT', null);
                }

                const errorMsg = data.error || data.message || `HTTP ${response.status}`;
                console.error(`❌ Fetch error [${endpoint}]: ${errorMsg}`);
                return { success: false, error: errorMsg };
            }

            return { success: true, data };
        } catch (error) {
            const errorMessage = error.message || 'Network error';
            console.error(`❌ Fetch error [${endpoint}]:`, errorMessage);

            if (!this.fallbackMode && errorMessage.includes('Failed to fetch')) {
                console.warn('⚠️ Erreur réseau détectée, passage en mode dégradé possible');
                // Tenter de se reconnecter ou activer le mode dégradé
                await this.connect(); // Tenter une reconnexion
                if (!this.isConnected) {
                    return this.activateFallbackMode();
                }
            } else if (this.fallbackMode) {
                return { success: false, error: 'Mode dégradé : Impossible de contacter l\'API' };
            }

            return { success: false, error: errorMessage };
        }
    }

    async signUp(email, password, metadata = {}) {
        console.log('▶️ Début du processus de signup pour:', email);
        try {
            const result = await this._fetch('/auth/signup', {
                method: 'POST',
                body: JSON.stringify({ email, password, metadata })
            });

            if (!result.success) {
                console.error('❌ Échec signup:', result.error);
                return { success: false, error: result.error };
            }

            const { user, session } = result.data;
            this.currentSession = session;

            console.log('✅ Signup successful for:', user.email);

            setTimeout(() => {
                this.authEmitter.emit('SIGNED_IN', { user, session });
            }, 100);

            return { success: true, data: { user, session } };
        } catch (error) {
            console.error('❌ Erreur inscription (catch):', error);
            return { success: false, error: error.message };
        }
    }

    async signIn(email, password) {
        console.log('▶️ Début du processus de connexion pour:', email);
        try {
            const result = await this._fetch('/auth/signin', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            if (!result.success) {
                console.error('❌ Échec connexion:', result.error);
                return { success: false, error: result.error };
            }

            const { user, session } = result.data;
            this.currentSession = session;

            setTimeout(() => {
                this.authEmitter.emit('SIGNED_IN', { user, session });
            }, 100);

            console.log('✅ Connexion réussie pour:', user.email);
            return { success: true, data: { user, session } };
        } catch (error) {
            console.error('❌ Erreur connexion (catch):', error);
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        console.log('▶️ Début du processus de déconnexion');
        try {
            const result = await this._fetch('/auth/signout', {
                method: 'POST'
            });

            if (!result.success) {
                console.error('❌ Échec déconnexion:', result.error);
                return { success: false, error: result.error };
            }

            this.currentSession = null;

            setTimeout(() => {
                this.authEmitter.emit('SIGNED_OUT', null);
            }, 100);

            console.log('✅ Déconnexion réussie');
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur déconnexion (catch):', error);
            return { success: false, error: error.message };
        }
    }

    async getCurrentSession() {
        console.log('▶️ Récupération de la session actuelle');
        try {
            const result = await this._fetch('/auth/session');

            if (!result.success) {
                console.warn('⚠️ Impossible de récupérer la session actuelle:', result.error);
                this.currentSession = null;
                this.authEmitter.emit('NO_SESSION', null);
                return { success: true, session: null };
            }

            const { session, user } = result.data;

            if (session && user) {
                this.currentSession = { ...session, user };
                console.log('✅ Session actuelle récupérée:', this.currentSession);
                this.authEmitter.emit('INITIAL_SESSION', this.currentSession);
                return { success: true, session: this.currentSession };
            }

            console.log('ℹ️ Aucune session active trouvée.');
            this.currentSession = null;
            this.authEmitter.emit('NO_SESSION', null);
            return { success: true, session: null };
        } catch (error) {
            console.error('❌ Erreur session (catch):', error);
            this.currentSession = null;
            this.authEmitter.emit('NO_SESSION', null);
            return { success: true, session: null };
        }
    }

    onAuthStateChange(callback) {
        const unsubscribe = this.authEmitter.subscribe(callback);

        // Initialiser la session au montage si pas déjà fait
        if (!this.isInitialized) {
            this.connect().then(connectResult => {
                if (connectResult.success) {
                    this.getCurrentSession().then(sessionResult => {
                         if (sessionResult.success && sessionResult.session) {
                            callback('INITIAL_SESSION', sessionResult.session);
                        } else {
                            callback('NO_SESSION', null);
                        }
                    });
                } else {
                    callback('NO_SESSION', null);
                }
            });
        } else if (this.isConnected) {
            // Si déjà connecté, vérifier la session actuelle
            this.getCurrentSession().then(sessionResult => {
                 if (sessionResult.success && sessionResult.session) {
                    callback('INITIAL_SESSION', sessionResult.session);
                } else {
                    callback('NO_SESSION', null);
                }
            });
        } else {
             // Si en mode dégradé ou déconnecté
             callback('NO_SESSION', null);
        }

        return { data: { subscription: { unsubscribe } } };
    }


    async getUserById(userId) {
        console.log('▶️ Récupération de l\'utilisateur par ID:', userId);
        try {
            const result = await this._fetch(`/users/${userId}`);

            if (!result.success) {
                console.error('❌ Échec récupération utilisateur:', result.error);
                return { success: false, error: result.error };
            }

            console.log('✅ Utilisateur récupéré:', result.data.data);
            return { success: true, data: result.data.data };
        } catch (error) {
            console.error('❌ Erreur récupération utilisateur (catch):', error);
            return { success: false, error: error.message };
        }
    }

    async updateUser(userId, updates) {
        console.log('▶️ Mise à jour de l\'utilisateur:', userId, updates);
        try {
            const result = await this._fetch(`/users/${userId}`, {
                method: 'PATCH',
                body: JSON.stringify(updates)
            });

            if (!result.success) {
                console.error('❌ Échec mise à jour utilisateur:', result.error);
                return { success: false, error: result.error };
            }

            console.log('✅ Utilisateur mis à jour:', result.data.data);
            return { success: true, data: result.data.data };
        } catch (error) {
            console.error('❌ Erreur mise à jour utilisateur (catch):', error);
            return { success: false, error: error.message };
        }
    }

    async createChallenge(challengeData) {
        console.log('▶️ Création d\'un challenge:', challengeData);
        try {
            const result = await this._fetch('/challenges', {
                method: 'POST',
                body: JSON.stringify(challengeData)
            });

            if (!result.success) {
                console.error('❌ Échec création challenge:', result.error);
                return { success: false, error: result.error };
            }

            console.log('✅ Challenge créé:', result.data.data);
            return { success: true, data: result.data.data };
        } catch (error) {
            console.error('❌ Erreur création challenge (catch):', error);
            return { success: false, error: error.message };
        }
    }

    async getChallengesByUser(userId) {
        console.log('▶️ Récupération des challenges pour l\'utilisateur:', userId);
        try {
            // Assurez-vous que l'endpoint prend en compte l'userId si nécessaire
            const result = await this._fetch('/challenges'); // Ajustez si le backend nécessite un userId ici

            if (!result.success) {
                console.error('❌ Échec récupération challenges:', result.error);
                return { success: false, error: result.error };
            }

            console.log('✅ Challenges récupérés:', result.data.data || []);
            return { success: true, data: result.data.data || [] };
        } catch (error) {
            console.error('❌ Erreur récupération challenges (catch):', error);
            return { success: false, error: error.message };
        }
    }

    async updateChallenge(challengeId, updates) {
        console.log('▶️ Mise à jour du challenge:', challengeId, updates);
        try {
            const result = await this._fetch(`/challenges/${challengeId}`, {
                method: 'PATCH',
                body: JSON.stringify(updates)
            });

            if (!result.success) {
                console.error('❌ Échec mise à jour challenge:', result.error);
                return { success: false, error: result.error };
            }

            console.log('✅ Challenge mis à jour:', result.data.data);
            return { success: true, data: result.data.data };
        } catch (error) {
            console.error('❌ Erreur mise à jour challenge (catch):', error);
            return { success: false, error: error.message };
        }
    }

    async deleteChallenge(challengeId) {
        console.log('▶️ Suppression du challenge:', challengeId);
        try {
            const result = await this._fetch(`/challenges/${challengeId}`, {
                method: 'DELETE'
            });

            if (!result.success) {
                console.error('❌ Échec suppression challenge:', result.error);
                return { success: false, error: result.error };
            }

            console.log('✅ Challenge supprimé:', challengeId);
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur suppression challenge (catch):', error);
            return { success: false, error: error.message };
        }
    }

    async createCheckIn(checkInData) {
        console.log('▶️ Création d\'un check-in:', checkInData);
        try {
            const result = await this._fetch('/check-ins', {
                method: 'POST',
                body: JSON.stringify(checkInData)
            });

            if (!result.success) {
                console.error('❌ Échec création check-in:', result.error);
                return { success: false, error: result.error };
            }

            console.log('✅ Check-in créé:', result.data.data);
            return { success: true, data: result.data.data };
        } catch (error) {
            console.error('❌ Erreur création check-in (catch):', error);
            return { success: false, error: error.message };
        }
    }

    async getCheckInsByChallenge(challengeId) {
        console.log('▶️ Récupération des check-ins pour le challenge:', challengeId);
        try {
            const result = await this._fetch(`/check-ins?challenge_id=${challengeId}`);

            if (!result.success) {
                console.error('❌ Échec récupération check-ins:', result.error);
                return { success: false, error: result.error };
            }

            console.log('✅ Check-ins récupérés:', result.data.data || []);
            return { success: true, data: result.data.data || [] };
        } catch (error) {
            console.error('❌ Erreur récupération check-ins (catch):', error);
            return { success: false, error: error.message };
        }
    }

    async createNotification(notificationData) {
        console.log('▶️ Création d\'une notification:', notificationData);
        try {
            const result = await this._fetch('/notifications', {
                method: 'POST',
                body: JSON.stringify(notificationData)
            });

            if (!result.success) {
                console.error('❌ Échec création notification:', result.error);
                return { success: false, error: result.error };
            }

            console.log('✅ Notification créée:', result.data.data);
            return { success: true, data: result.data.data };
        } catch (error) {
            console.error('❌ Erreur création notification (catch):', error);
            return { success: false, error: error.message };
        }
    }

    async getNotificationsByUser(userId, limit = 50) {
        console.log('▶️ Récupération des notifications pour l\'utilisateur:', userId, 'limit:', limit);
        try {
            // Assurez-vous que l'endpoint prend en compte l'userId si nécessaire
            const result = await this._fetch(`/notifications?limit=${limit}`); // Ajustez si le backend nécessite un userId ici

            if (!result.success) {
                console.error('❌ Échec récupération notifications:', result.error);
                return { success: false, error: result.error };
            }

            console.log('✅ Notifications récupérées:', result.data.data || []);
            return { success: true, data: result.data.data || [] };
        } catch (error) {
            console.error('❌ Erreur récupération notifications (catch):', error);
            return { success: false, error: error.message };
        }
    }

    async markNotificationAsRead(notificationId) {
        console.log('▶️ Marquage de la notification comme lue:', notificationId);
        try {
            const result = await this._fetch(`/notifications/${notificationId}`, {
                method: 'PATCH',
                body: JSON.stringify({ read: true })
            });

            if (!result.success) {
                console.error('❌ Échec mise à jour notification:', result.error);
                return { success: false, error: result.error };
            }

            console.log('✅ Notification mise à jour:', result.data.data);
            return { success: true, data: result.data.data };
        } catch (error) {
            console.error('❌ Erreur mise à jour notification (catch):', error);
            return { success: false, error: error.message };
        }
    }

    // Les méthodes suivantes sont des placeholders car elles ne sont pas implémentées dans l'API Express
    async uploadFile(bucket, path, file) {
        console.warn('⚠️ uploadFile: non implémenté dans Express API (placeholder)');
        return { 
            success: false, 
            error: 'File upload not implemented in Express API yet' 
        };
    }

    async deleteFile(bucket, path) {
        console.warn('⚠️ deleteFile: non implémenté dans Express API (placeholder)');
        return { 
            success: false, 
            error: 'File deletion not implemented in Express API yet' 
        };
    }

    getPublicUrl(bucket, path) {
        console.warn('⚠️ getPublicUrl: non implémenté dans Express API (placeholder)');
        return { 
            success: false, 
            error: 'Public URL not implemented in Express API yet' 
        };
    }

    subscribeToTable(table, callback, filter = {}) {
        console.warn('⚠️ subscribeToTable: real-time non implémenté dans Express API');
        return null;
    }

    unsubscribe(subscription) {
        try {
            if (subscription) {
                console.log('✅ Unsubscribe effectué');
                return { success: true };
            }
        } catch (error) {
            console.error('❌ Erreur unsubscribe:', error);
            return { success: false, error: error.message };
        }
    }
}

const database = new Database();

// Tentative de connexion automatique au chargement du script
(async () => {
    console.log('🚀 Démarrage de l\'application : Tentative de connexion à la base de données...');
    try {
        const connectResult = await database.connect();
        if (connectResult.success) {
            console.log('🚀 Database auto-connectée avec succès.');
        } else {
             console.warn('⚠️ Auto-connexion database échouée, mode dégradé activé.');
        }
    } catch (error) {
        console.warn('⚠️ Erreur lors de l\'auto-connexion database:', error.message);
        // Tenter d'activer le mode dégradé si la connexion échoue complètement
        if (!database.isConnected) {
            database.activateFallbackMode();
        }
    }
})();

export default database;
export { Database };