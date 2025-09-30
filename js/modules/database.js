// Base de données - Interface Express API Backend
const API_BASE_URL = 'http://localhost:3000/api';

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
            const response = await Promise.race([
                fetch(`${API_BASE_URL.replace('/api', '')}/api/health`, {
                    credentials: 'include'
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), this.connectionTimeout)
                )
            ]);

            if (!response.ok) {
                throw new Error('API non disponible');
            }

            this.client = { connected: true };
            this.isConnected = true;
            this.isInitialized = true;
            this.retryCount = 0;

            console.log('✅ Database connectée à Express API');
            return { success: true, message: 'Connexion réussie' };

        } catch (error) {
            console.error('❌ Erreur connexion database:', error);

            this.retryCount++;
            if (this.retryCount < this.maxRetries) {
                console.log(`🔄 Tentative ${this.retryCount}/${this.maxRetries}`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.connect();
            }

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
        const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
        
        const defaultOptions = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    this.currentSession = null;
                    this.authEmitter.emit('SIGNED_OUT', null);
                }
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return { success: true, response, data };
        } catch (error) {
            console.error(`❌ Fetch error [${endpoint}]:`, error);
            return { success: false, error: error.message };
        }
    }

    async signUp(email, password, metadata = {}) {
        try {
            const result = await this._fetch('/auth/signup', {
                method: 'POST',
                body: JSON.stringify({ email, password, metadata })
            });

            if (!result.success) {
                return { success: false, error: result.error };
            }

            const { user, session } = result.data;
            this.currentSession = session;

            setTimeout(() => {
                this.authEmitter.emit('SIGNED_IN', { user, session });
            }, 100);

            return { success: true, data: { user, session } };
        } catch (error) {
            console.error('❌ Erreur inscription:', error);
            return { success: false, error: error.message };
        }
    }

    async signIn(email, password) {
        try {
            const result = await this._fetch('/auth/signin', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            if (!result.success) {
                return { success: false, error: result.error };
            }

            const { user, session } = result.data;
            this.currentSession = session;

            setTimeout(() => {
                this.authEmitter.emit('SIGNED_IN', { user, session });
            }, 100);

            return { success: true, data: { user, session } };
        } catch (error) {
            console.error('❌ Erreur connexion:', error);
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        try {
            const result = await this._fetch('/auth/signout', {
                method: 'POST'
            });

            if (!result.success) {
                return { success: false, error: result.error };
            }

            this.currentSession = null;

            setTimeout(() => {
                this.authEmitter.emit('SIGNED_OUT', null);
            }, 100);

            return { success: true };
        } catch (error) {
            console.error('❌ Erreur déconnexion:', error);
            return { success: false, error: error.message };
        }
    }

    async getCurrentSession() {
        try {
            const result = await this._fetch('/auth/session');

            if (!result.success) {
                this.currentSession = null;
                return { success: true, session: null };
            }

            const { session, user } = result.data;
            
            if (session && user) {
                this.currentSession = { ...session, user };
                return { success: true, session: this.currentSession };
            }

            this.currentSession = null;
            return { success: true, session: null };
        } catch (error) {
            console.error('❌ Erreur session:', error);
            this.currentSession = null;
            return { success: true, session: null };
        }
    }

    onAuthStateChange(callback) {
        const unsubscribe = this.authEmitter.subscribe(callback);

        setTimeout(async () => {
            const sessionResult = await this.getCurrentSession();
            if (sessionResult.success && sessionResult.session) {
                callback('INITIAL_SESSION', sessionResult.session);
            } else {
                callback('NO_SESSION', null);
            }
        }, 100);

        return { data: { subscription: { unsubscribe } } };
    }

    async createUser(userData) {
        console.warn('⚠️ createUser: géré par signUp dans Express API');
        return { 
            success: true, 
            data: userData,
            message: 'User creation handled by signUp'
        };
    }

    async getUserById(userId) {
        try {
            const result = await this._fetch(`/users/${userId}`);

            if (!result.success) {
                return { success: false, error: result.error };
            }

            return { success: true, data: result.data.data };
        } catch (error) {
            console.error('❌ Erreur récupération utilisateur:', error);
            return { success: false, error: error.message };
        }
    }

    async updateUser(userId, updates) {
        try {
            const result = await this._fetch(`/users/${userId}`, {
                method: 'PATCH',
                body: JSON.stringify(updates)
            });

            if (!result.success) {
                return { success: false, error: result.error };
            }

            return { success: true, data: result.data.data };
        } catch (error) {
            console.error('❌ Erreur mise à jour utilisateur:', error);
            return { success: false, error: error.message };
        }
    }

    async createChallenge(challengeData) {
        try {
            const result = await this._fetch('/challenges', {
                method: 'POST',
                body: JSON.stringify(challengeData)
            });

            if (!result.success) {
                return { success: false, error: result.error };
            }

            return { success: true, data: result.data.data };
        } catch (error) {
            console.error('❌ Erreur création challenge:', error);
            return { success: false, error: error.message };
        }
    }

    async getChallengesByUser(userId) {
        try {
            const result = await this._fetch('/challenges');

            if (!result.success) {
                return { success: false, error: result.error };
            }

            return { success: true, data: result.data.data || [] };
        } catch (error) {
            console.error('❌ Erreur récupération challenges:', error);
            return { success: false, error: error.message };
        }
    }

    async updateChallenge(challengeId, updates) {
        try {
            const result = await this._fetch(`/challenges/${challengeId}`, {
                method: 'PATCH',
                body: JSON.stringify(updates)
            });

            if (!result.success) {
                return { success: false, error: result.error };
            }

            return { success: true, data: result.data.data };
        } catch (error) {
            console.error('❌ Erreur mise à jour challenge:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteChallenge(challengeId) {
        try {
            const result = await this._fetch(`/challenges/${challengeId}`, {
                method: 'DELETE'
            });

            if (!result.success) {
                return { success: false, error: result.error };
            }

            return { success: true };
        } catch (error) {
            console.error('❌ Erreur suppression challenge:', error);
            return { success: false, error: error.message };
        }
    }

    async createCheckIn(checkInData) {
        try {
            const result = await this._fetch('/check-ins', {
                method: 'POST',
                body: JSON.stringify(checkInData)
            });

            if (!result.success) {
                return { success: false, error: result.error };
            }

            return { success: true, data: result.data.data };
        } catch (error) {
            console.error('❌ Erreur création check-in:', error);
            return { success: false, error: error.message };
        }
    }

    async getCheckInsByChallenge(challengeId) {
        try {
            const result = await this._fetch(`/check-ins?challenge_id=${challengeId}`);

            if (!result.success) {
                return { success: false, error: result.error };
            }

            return { success: true, data: result.data.data || [] };
        } catch (error) {
            console.error('❌ Erreur récupération check-ins:', error);
            return { success: false, error: error.message };
        }
    }

    async createNotification(notificationData) {
        try {
            const result = await this._fetch('/notifications', {
                method: 'POST',
                body: JSON.stringify(notificationData)
            });

            if (!result.success) {
                return { success: false, error: result.error };
            }

            return { success: true, data: result.data.data };
        } catch (error) {
            console.error('❌ Erreur création notification:', error);
            return { success: false, error: error.message };
        }
    }

    async getNotificationsByUser(userId, limit = 50) {
        try {
            const result = await this._fetch(`/notifications?limit=${limit}`);

            if (!result.success) {
                return { success: false, error: result.error };
            }

            return { success: true, data: result.data.data || [] };
        } catch (error) {
            console.error('❌ Erreur récupération notifications:', error);
            return { success: false, error: error.message };
        }
    }

    async markNotificationAsRead(notificationId) {
        try {
            const result = await this._fetch(`/notifications/${notificationId}`, {
                method: 'PATCH',
                body: JSON.stringify({ read: true })
            });

            if (!result.success) {
                return { success: false, error: result.error };
            }

            return { success: true, data: result.data.data };
        } catch (error) {
            console.error('❌ Erreur mise à jour notification:', error);
            return { success: false, error: error.message };
        }
    }

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

(async () => {
    try {
        await database.connect();
        console.log('🚀 Database auto-connectée');
    } catch (error) {
        console.warn('⚠️ Auto-connexion database échouée:', error.message);
    }
})();

export default database;
export { Database };
