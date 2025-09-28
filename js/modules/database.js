// Base de données - Interface Supabase sécurisée
import { createClient } from '@supabase/supabase-js';

// Configuration sécurisée avec variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://lcbvjrukxjnenzficeci.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjYnZqcnVreGpuZW56ZmljZWNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5OTM0NjIsImV4cCI6MjA1MTU2OTQ2Mn0.FbZ1zDUyOmOJg9oN7bqy7Y8W7VU9l7J2mF5P9X8j3QE';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Variables d\'environnement Supabase manquantes');
}

// Initialiser Supabase avec configuration sécurisée
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
});

// Classe Database pour gérer toutes les interactions
class Database {
    constructor() {
        this.client = supabase;
    }

    // ========== AUTHENTIFICATION ==========
    async signUp(email, password, metadata = {}) {
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
        return this.client.auth.onAuthStateChange(callback);
    }

    // ========== UTILISATEURS ==========
    async createUser(userData) {
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
        try {
            const { data, error } = await this.client
                .from('checkins')
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
        try {
            const { data, error } = await this.client
                .from('checkins')
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

export default database;
export { Database, supabase };