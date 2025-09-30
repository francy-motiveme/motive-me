// Service Email pour témoins - EmailJS Integration
export class EmailService {
    constructor() {
        this.isInitialized = false;
        this.emailjsKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';
        this.serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'default_service';
        this.templates = this.initializeTemplates();
    }

    // ========== INITIALISATION ==========
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Charger EmailJS si disponible
            if (typeof emailjs !== 'undefined') {
                emailjs.init(this.emailjsKey);
                this.isInitialized = true;
                console.log('✅ EmailJS initialized');
            } else {
                console.warn('⚠️ EmailJS not available, using mock email service');
                this.isInitialized = true; // Mode simulation
            }
        } catch (error) {
            console.error('❌ Email service initialization failed:', error);
            this.isInitialized = true; // Mode simulation
        }
    }

    // ========== TEMPLATES ==========
    initializeTemplates() {
        return {
            new_challenge: {
                subject: '🎯 Nouveau Challenge - Tu es témoin !',
                template: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
                        <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; border-radius: 12px; text-align: center; color: white; margin-bottom: 20px;">
                            <h1 style="margin: 0; font-size: 28px;">🎯 MotiveMe</h1>
                            <p style="margin: 10px 0 0 0; opacity: 0.9;">Nouveau Challenge</p>
                        </div>
                        
                        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            <h2 style="color: #1f2937; margin: 0 0 20px 0;">Tu es témoin d'un nouveau challenge !</h2>
                            
                            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1;">
                                <h3 style="margin: 0 0 10px 0; color: #1f2937;">{{challengeTitle}}</h3>
                                <p style="margin: 0; color: #4b5563;">Durée: {{duration}} jours</p>
                                <p style="margin: 5px 0 0 0; color: #4b5563;">Gage: {{gage}}</p>
                            </div>
                            
                            <p style="color: #4b5563; line-height: 1.6;">
                                <strong>{{userName}}</strong> a créé un nouveau challenge et t'a choisi comme témoin ! 
                                Ton rôle est important : tu recevras des notifications sur ses progrès et pourras 
                                l'encourager dans sa démarche.
                            </p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{{challengeUrl}}" style="background: #6366f1; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; display: inline-block;">
                                    👀 Voir le Challenge
                                </a>
                            </div>
                            
                            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 0; color: #92400e; font-size: 14px;">
                                    💡 <strong>Astuce :</strong> Tes encouragements peuvent faire la différence ! 
                                    N'hésite pas à envoyer des messages de motivation.
                                </p>
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin: 20px 0; color: #6b7280; font-size: 12px;">
                            <p>MotiveMe - Atteins tes objectifs avec la pression sociale</p>
                            <p>Si tu ne souhaites plus recevoir ces notifications, <a href="{{unsubscribeUrl}}" style="color: #6366f1;">clique ici</a></p>
                        </div>
                    </div>
                `
            },

            challenge_completed: {
                subject: '🏆 Challenge Terminé avec Succès !',
                template: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f0fdf4; padding: 20px;">
                        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px; text-align: center; color: white; margin-bottom: 20px;">
                            <h1 style="margin: 0; font-size: 28px;">🏆 Succès !</h1>
                            <p style="margin: 10px 0 0 0; opacity: 0.9;">Challenge Terminé</p>
                        </div>
                        
                        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            <h2 style="color: #1f2937; margin: 0 0 20px 0;">🎉 Challenge réussi avec brio !</h2>
                            
                            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                                <h3 style="margin: 0 0 10px 0; color: #1f2937;">{{challengeTitle}}</h3>
                                <p style="margin: 0; color: #065f46;">✅ Taux de réussite: {{completionRate}}%</p>
                                <p style="margin: 5px 0 0 0; color: #065f46;">🔥 Série: {{streak}} jours</p>
                            </div>
                            
                            <p style="color: #4b5563; line-height: 1.6;">
                                <strong>{{userName}}</strong> a brillamment terminé son challenge ! 
                                Grâce à ta présence en tant que témoin, il/elle a maintenu sa motivation 
                                et atteint son objectif. 
                            </p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{{challengeUrl}}" style="background: #10b981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; display: inline-block;">
                                    🎯 Voir les Résultats
                                </a>
                            </div>
                            
                            <div style="background: #ddd6fe; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 0; color: #5b21b6; font-size: 14px;">
                                    🌟 <strong>Merci !</strong> Ton soutien a été précieux dans cette réussite. 
                                    Que dirais-tu de créer ton propre challenge ?
                                </p>
                            </div>
                        </div>
                    </div>
                `
            },

            daily_reminder: {
                subject: '⏰ Rappel Challenge - {{userName}}',
                template: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fef3c7; padding: 20px;">
                        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; border-radius: 12px; text-align: center; color: white; margin-bottom: 20px;">
                            <h1 style="margin: 0; font-size: 24px;">⏰ Rappel</h1>
                        </div>
                        
                        <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            <h2 style="color: #1f2937; margin: 0 0 15px 0;">Check-in en attente</h2>
                            
                            <p style="color: #4b5563; line-height: 1.6;">
                                <strong>{{userName}}</strong> n'a pas encore fait son check-in aujourd'hui 
                                pour le challenge "{{challengeTitle}}".
                            </p>
                            
                            <p style="color: #4b5563; line-height: 1.6; margin-top: 15px;">
                                En tant que témoin, tu peux l'encourager à maintenir sa routine ! 
                                Un petit message de motivation peut faire toute la différence.
                            </p>
                            
                            <div style="text-align: center; margin: 20px 0;">
                                <a href="{{challengeUrl}}" style="background: #f59e0b; color: white; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; display: inline-block;">
                                    💪 Encourager
                                </a>
                            </div>
                        </div>
                    </div>
                `
            },

            challenge_failed: {
                subject: '😔 Challenge Non Terminé',
                template: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fef2f2; padding: 20px;">
                        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 20px; border-radius: 12px; text-align: center; color: white; margin-bottom: 20px;">
                            <h1 style="margin: 0; font-size: 24px;">😔 Challenge Terminé</h1>
                        </div>
                        
                        <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            <h2 style="color: #1f2937; margin: 0 0 15px 0;">Le challenge n'a pas été terminé</h2>
                            
                            <p style="color: #4b5563; line-height: 1.6;">
                                <strong>{{userName}}</strong> n'a pas pu terminer complètement le challenge 
                                "{{challengeTitle}}", mais ce n'est pas grave !
                            </p>
                            
                            <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
                                <p style="margin: 0; color: #1e40af; font-size: 14px;">
                                    💪 <strong>L'important c'est d'essayer !</strong> Chaque tentative est un pas vers la réussite.
                                </p>
                            </div>
                            
                            <p style="color: #4b5563; line-height: 1.6;">
                                En tant que témoin, tu peux l'encourager à recommencer ou à essayer un nouveau challenge. 
                                Ton soutien reste précieux !
                            </p>
                        </div>
                    </div>
                `
            }
        };
    }

    // ========== ENVOI D'EMAILS ==========
    async sendEmail(templateId, data) {
        await this.initialize();

        try {
            const template = this.templates[templateId];
            if (!template) {
                throw new Error(`Template ${templateId} not found`);
            }

            // Remplacer les variables dans le template
            const emailContent = this.processTemplate(template.template, data);
            const subject = this.processTemplate(template.subject, data);

            // Si EmailJS est disponible, envoyer vraiment
            if (typeof emailjs !== 'undefined' && this.emailjsKey) {
                const result = await emailjs.send(
                    this.serviceId,
                    templateId,
                    {
                        to_email: data.witnessEmail,
                        subject: subject,
                        html_content: emailContent,
                        ...data
                    }
                );

                console.log('✅ Email sent successfully:', result);
                return { success: true, result };
            } else {
                // Mode simulation
                console.log('📧 EMAIL SIMULATION:', {
                    to: data.witnessEmail,
                    subject: subject,
                    template: templateId,
                    data: data
                });

                // Simuler un délai d'envoi
                await new Promise(resolve => setTimeout(resolve, 500));

                return { success: true, simulated: true };
            }

        } catch (error) {
            console.error('❌ Email sending failed:', error);
            return { success: false, error: error.message };
        }
    }

    // ========== PROCESSING TEMPLATES ==========
    processTemplate(template, data) {
        let processed = template;

        // Remplacer toutes les variables {{variable}}
        Object.keys(data).forEach(key => {
            const placeholder = new RegExp(`{{${key}}}`, 'g');
            processed = processed.replace(placeholder, data[key] || '');
        });

        return processed;
    }

    // ========== MÉTHODES SPÉCIFIQUES ==========
    async notifyNewChallenge(challenge, witnessEmail) {
        return await this.sendEmail('new_challenge', {
            witnessEmail: witnessEmail,
            userName: challenge.user_name || 'Un utilisateur',
            challengeTitle: challenge.title,
            duration: challenge.duration,
            gage: challenge.gage,
            challengeUrl: `${window.location.origin}/witness/${challenge.id}`,
            unsubscribeUrl: `${window.location.origin}/unsubscribe?email=${encodeURIComponent(witnessEmail)}`
        });
    }

    async notifyChallengeCompleted(challenge, witnessEmail) {
        return await this.sendEmail('challenge_completed', {
            witnessEmail: witnessEmail,
            userName: challenge.user_name || 'Un utilisateur',
            challengeTitle: challenge.title,
            completionRate: challenge.completion_rate || 0,
            streak: challenge.current_streak || 0,
            challengeUrl: `${window.location.origin}/witness/${challenge.id}`
        });
    }

    async sendDailyReminder(challenge, witnessEmail) {
        return await this.sendEmail('daily_reminder', {
            witnessEmail: witnessEmail,
            userName: challenge.user_name || 'Un utilisateur',
            challengeTitle: challenge.title,
            challengeUrl: `${window.location.origin}/witness/${challenge.id}`
        });
    }

    async notifyChallengeFailed(challenge, witnessEmail) {
        return await this.sendEmail('challenge_failed', {
            witnessEmail: witnessEmail,
            userName: challenge.user_name || 'Un utilisateur',
            challengeTitle: challenge.title,
            challengeUrl: `${window.location.origin}/witness/${challenge.id}`
        });
    }

    // ========== CONFIGURATION ==========
    setEmailJSConfig(publicKey, serviceId) {
        this.emailjsKey = publicKey;
        this.serviceId = serviceId;
        this.isInitialized = false;
    }

    // ========== VALIDATION ==========
    validateEmailData(data) {
        const required = ['witnessEmail', 'userName', 'challengeTitle'];
        const missing = required.filter(field => !data[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }

        // Valider l'email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.witnessEmail)) {
            throw new Error('Invalid email format');
        }

        return true;
    }

    // ========== STATISTIQUES ==========
    getEmailStats() {
        return {
            isConfigured: !!this.emailjsKey,
            service: this.serviceId,
            templatesCount: Object.keys(this.templates).length
        };
    }
}

// Instance singleton
const emailService = new EmailService();

export default emailService;