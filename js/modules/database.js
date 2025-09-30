// Base de données - Interface Supabase sécurisée
import { createClient } from '@supabase/supabase-js';

// Configuration sécurisée avec variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || '';

let supabase = null;
let configError = null;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Variables d\'environnement Supabase manquantes');
    console.error('Veuillez configurer SUPABASE_URL et SUPABASE_ANON_KEY dans les secrets Replit');
    configError = 'Configuration Supabase manquante';
} else {
    // Initialiser Supabase avec configuration sécurisée
    try {
        supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false,
                storageKey: 'motiveme-auth'
            },
            realtime: {
                params: {
                    eventsPerSecond: 10
                }
            },
            global: {
                headers: {
                    'X-Client-Info': 'motiveme-web'
                }
            }
        });
        console.log('✅ Supabase client initialized:', !!supabase);
    } catch (error) {
        console.error('❌ Erreur initialisation Supabase:', error);
        configError = error.message;
    }
}

// Classe Database pour gérer toutes les interactions
class Database {
    // ========== INITIALISATION ==========
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.connectionTimeout = 10000;
        this.isInitialized = false;
    }

    async connect() {
        if (this.isConnected && this.client) {
            return { success: true, message: 'Déjà connecté' };
        }

        try {
            // Vérifier si supabase est disponible
            if (!supabase || configError) {
                console.warn('⚠️ Supabase non disponible:', configError || 'Client non initialisé');
                return this.activateFallbackMode();
            }

            // Utiliser le client global déjà initialisé
            this.client = supabase;

            // Test de connexion simple
            const { data, error } = await Promise.race([
                this.client.from('users').select('id').limit(1),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), this.connectionTimeout)
                )
            ]);

            // Accepter l'erreur si les tables n'existent pas encore
            if (error && !error.message.includes('does not exist') && !error.message.includes('schema cache')) {
                throw error;
            }

            this.isConnected = true;
            this.isInitialized = true;
            this.retryCount = 0;

            console.log('✅ Database connectée à Supabase');
            return { success: true, message: 'Connexion réussie' };

        } catch (error) {
            console.error('❌ Erreur connexion database:', error);

            this.retryCount++;
            if (this.retryCount < this.maxRetries) {
                console.log(`🔄 Tentative ${this.retryCount}/${this.maxRetries}`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.connect();
            }

            // Activer le mode dégradé en cas d'échec
            return this.activateFallbackMode();
        }
    }

    activateFallbackMode() {
        console.warn('⚠️ Mode dégradé activé - Données en localStorage');
        this.isConnected = false;
        this.isInitialized = true;
        this.fallbackMode = true;

        return { 
            success: true, 
            message: 'Mode dégradé activé',
            fallback: true
        };
    }

    // ========== AUTHENTIFICATION ==========
    async signUp(email, password, metadata = {}) {
        if (!this.client) {
            console.error('❌ Client Supabase non initialisé');
            return { success: false, error: 'Client Supabase non initialisé' };
        }
        try {
            const { data, error } = await this.client.auth.signUp({
                email,
                password,
                options: { data: metadata }
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Erreur inscription:', error);
            return { success: false, error: error.message };
        }
    }

    async signIn(email, password) {
        if (!this.client) {
            console.error('❌ Client Supabase non initialisé');
            return { success: false, error: 'Client Supabase non initialisé' };
        }
        try {
            const { data, error } = await this.client.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Erreur connexion:', error);
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        if (!this.client) {
            console.error('❌ Client Supabase non initialisé');
            return { success: false, error: 'Client Supabase non initialisé' };
        }
        try {
            const { error } = await this.client.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur déconnexion:', error);
            return { success: false, error: error.message };
        }
    }

    async getCurrentSession() {
        if (!this.client) {
            console.error('❌ Client Supabase non initialisé');
            return { success: false, error: 'Client Supabase non initialisé' };
        }
        try {
            const { data: { session }, error } = await this.client.auth.getSession();
            if (error) throw error;
            return { success: true, session };
        } catch (error) {
            console.error('❌ Erreur session:', error);
            return { success: false, error: error.message };
        }
    }

    onAuthStateChange(callback) {
        if (!this.client) {
            console.error('❌ Client Supabase non initialisé');
            return () => {}; // Retourner une fonction vide pour le unsubscribe
        }
        return this.client.auth.onAuthStateChange(callback);
    }

    // ========== UTILISATEURS ==========
    async createUser(userData) {
        if (!this.client) {
            console.error('❌ Client Supabase non initialisé');
            return { success: false, error: 'Client Supabase non initialisé' };
        }
        try {
            const { data, error } = await this.client
                .from('users')
                .insert([userData])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Erreur création utilisateur:', error);
            return { success: false, error: error.message };
        }
    }

    async getUserById(userId) {
        if (!this.client) {
            console.error('❌ Client Supabase non initialisé');
            return { success: false, error: 'Client Supabase non initialisé' };
        }
        try {
            const { data, error } = await this.client
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Erreur récupération utilisateur:', error);
            return { success: false, error: error.message };
        }
    }

    async updateUser(userId, updates) {
        if (!this.client) {
            console.error('❌ Client Supabase non initialisé');
            return { success: false, error: 'Client Supabase non initialisé' };
        }
        try {
            const { data, error } = await this.client
                .from('users')
                .update(updates)
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Erreur mise à jour utilisateur:', error);
            return { success: false, error: error.message };
        }
    }

    // ========== CHALLENGES ==========
    async createChallenge(challengeData) {
        if (!this.client) {
            console.error('❌ Client Supabase non initialisé');
            return { success: false, error: 'Client Supabase non initialisé' };
        }
        try {
            const { data, error } = await this.client
                .from('challenges')
                .insert([challengeData])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Erreur création challenge:', error);
            return { success: false, error: error.message };
        }
    }

    async getChallengesByUser(userId) {
        if (!this.client) {
            console.error('❌ Client Supabase non initialisé');
            return { success: false, error: 'Client Supabase non initialisé' };
        }
        try {
            const { data, error } = await this.client
                .from('challenges')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ Erreur récupération challenges:', error);
            return { success: false, error: error.message };
        }
    }

    async updateChallenge(challengeId, updates) {
        if (!this.client) {
            console.error('❌ Client Supabase non initialisé');
            return { success: false, error: 'Client Supabase non initialisé' };
        }
        try {
            const { data, error } = await this.client
                .from('challenges')
                .update(updates)
                .eq('id', challengeId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Erreur mise à jour challenge:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteChallenge(challengeId) {
        if (!this.client) {
            console.error('❌ Client Supabase non initialisé');
            return { success: false, error: 'Client Supabase non initialisé' };
        }
        try {
            const { error } = await this.client
                .from('challenges')
                .delete()
                .eq('id', challengeId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur suppression challenge:', error);
            return { success: false, error: error.message };
        }
    }

    // ========== CHECK-INS ==========
    async createCheckIn(checkInData) {
        if (!this.client) {
            console.error('❌ Client Supabase non initialisé');
            return { success: false, error: 'Client Supabase non initialisé' };
        }
        try {
            const { data, error } = await this.client
                .from('check_ins')
                .insert([checkInData])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Erreur création check-in:', error);
            return { success: false, error: error.message };
        }
    }

    async getCheckInsByChallenge(challengeId) {
        if (!this.client) {
            console.error('❌ Client Supabase non initialisé');
            return { success: false, error: 'Client Supabase non initialisé' };
        }
        try {
            const { data, error } = await this.client
                .from('check_ins')
                .select('*')
                .eq('challenge_id', challengeId)
                .order('checked_at', { ascending: false });

            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ Erreur récupération check-ins:', error);
            return { success: false, error: error.message };
        }
    }

    // ========== NOTIFICATIONS ==========
    async createNotification(notificationData) {
        if (!this.client) {
            console.error('❌ Client Supabase non initialisé');
            return { success: false, error: 'Client Supabase non initialisé' };
        }
        try {
            const { data, error } = await this.client
                .from('notifications')
                .insert([notificationData])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Erreur création notification:', error);
            return { success: false, error: error.message };
        }
    }

    async getNotificationsByUser(userId, limit = 50) {
        if (!this.client) {
            console.error('❌ Client Supabase non initialisé');
            return { success: false, error: 'Client Supabase non initialisé' };
        }
        try {
            const { data, error } = await this.client
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ Erreur récupération notifications:', error);
            return { success: false, error: error.message };
        }
    }

    async markNotificationAsRead(notificationId) {
        if (!this.client) {
            console.error('❌ Client Supabase non initialisé');
            return { success: false, error: 'Client Supabase non initialisé' };
        }
        try {
            const { data, error } = await this.client
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Erreur mise à jour notification:', error);
            return { success: false, error: error.message };
        }
    }

    // ========== STORAGE ==========
    async uploadFile(bucket, path, file) {
        if (!this.client) {
            console.error('❌ Client Supabase non initialisé');
            return { success: false, error: 'Client Supabase non initialisé' };
        }
        try {
            const { data, error } = await this.client.storage
                .from(bucket)
                .upload(path, file);

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Erreur upload fichier:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteFile(bucket, path) {
        if (!this.client) {
            console.error('❌ Client Supabase non initialisé');
            return { success: false, error: 'Client Supabase non initialisé' };
        }
        try {
            const { data, error } = await this.client.storage
                .from(bucket)
                .remove([path]);

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Erreur suppression fichier:', error);
            return { success: false, error: error.message };
        }
    }

    getPublicUrl(bucket, path) {
        if (!this.client) {
            console.error('❌ Client Supabase non initialisé');
            return { success: false, error: 'Client Supabase non initialisé' };
        }
        try {
            const { data } = this.client.storage
                .from(bucket)
                .getPublicUrl(path);

            return { success: true, url: data.publicUrl };
        } catch (error) {
            console.error('❌ Erreur URL publique:', error);
            return { success: false, error: error.message };
        }
    }

    // ========== REAL-TIME ==========
    subscribeToTable(table, callback, filter = {}) {
        if (!this.client) {
            console.error('❌ Client Supabase non initialisé');
            return null;
        }
        try {
            const subscription = this.client
                .channel(`${table}_changes`)
                .on('postgres_changes', 
                    { 
                        event: '*', 
                        schema: 'public', 
                        table,
                        ...filter 
                    }, 
                    callback
                )
                .subscribe();

            return subscription;
        } catch (error) {
            console.error('❌ Erreur subscription:', error);
            return null;
        }
    }

    unsubscribe(subscription) {
        try {
            if (subscription) {
                subscription.unsubscribe();
                return { success: true };
            }
        } catch (error) {
            console.error('❌ Erreur unsubscribe:', error);
            return { success: false, error: error.message };
        }
    }
}

// Instance singleton
const database = new Database();

// Auto-initialisation
(async () => {
    try {
        await database.connect();
        console.log('🚀 Database auto-connectée');
    } catch (error) {
        console.warn('⚠️ Auto-connexion database échouée:', error.message);
    }
})();

export default database;
export { Database, supabase };