// Système de notifications avancé
export class NotificationManager {
    constructor() {
        this.notifications = new Map();
        this.container = null;
        this.maxNotifications = 5;
        this.defaultDuration = 5000;
        this.position = 'top-right';
        this.createContainer();
    }

    // ========== INITIALISATION ==========
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = `notification-container ${this.position}`;
        document.body.appendChild(this.container);
    }

    // ========== AFFICHAGE NOTIFICATIONS ==========
    show(message, type = 'info', options = {}) {
        const config = {
            duration: this.defaultDuration,
            persistent: false,
            actions: [],
            icon: null,
            title: null,
            onClick: null,
            onClose: null,
            ...options
        };

        const id = this.generateId();
        const notification = this.createNotification(id, message, type, config);
        
        // Ajouter à la map
        this.notifications.set(id, {
            element: notification,
            config,
            timestamp: Date.now()
        });

        // Ajouter au container
        this.container.appendChild(notification);

        // Animation d'entrée
        requestAnimationFrame(() => {
            notification.classList.add('visible');
        });

        // Auto-suppression si pas persistante
        if (!config.persistent && config.duration > 0) {
            setTimeout(() => {
                this.hide(id);
            }, config.duration);
        }

        // Limiter le nombre de notifications
        this.limitNotifications();

        return id;
    }

    createNotification(id, message, type, config) {
        const notification = document.createElement('div');
        notification.id = `notification-${id}`;
        notification.className = `notification notification-${type}`;
        notification.setAttribute('data-type', type);

        const icon = config.icon || this.getDefaultIcon(type);
        const title = config.title ? `<div class="notification-title">${config.title}</div>` : '';
        
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${icon}</div>
                <div class="notification-text">
                    ${title}
                    <div class="notification-message">${message}</div>
                </div>
                <div class="notification-actions">
                    ${this.renderActions(config.actions, id)}
                    <button class="notification-close" data-action="close" data-id="${id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            ${config.duration > 0 && !config.persistent ? this.createProgressBar(config.duration) : ''}
        `;

        // Event listeners
        this.attachNotificationListeners(notification, id, config);

        return notification;
    }

    renderActions(actions, notificationId) {
        return actions.map(action => `
            <button class="notification-action" 
                    data-action="${action.action}" 
                    data-id="${notificationId}"
                    style="background: ${action.color || '#6366f1'}">
                ${action.label}
            </button>
        `).join('');
    }

    createProgressBar(duration) {
        return `
            <div class="notification-progress">
                <div class="notification-progress-bar" style="animation-duration: ${duration}ms"></div>
            </div>
        `;
    }

    // ========== EVENT LISTENERS ==========
    attachNotificationListeners(notification, id, config) {
        // Click sur la notification
        if (config.onClick) {
            notification.addEventListener('click', (e) => {
                if (!e.target.closest('.notification-actions')) {
                    config.onClick(id, notification);
                }
            });
        }

        // Actions
        notification.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('[data-action]');
            if (!actionBtn) return;

            const action = actionBtn.dataset.action;
            const notificationId = actionBtn.dataset.id;

            if (action === 'close') {
                this.hide(notificationId);
            } else {
                // Action personnalisée
                const actionConfig = config.actions.find(a => a.action === action);
                if (actionConfig && actionConfig.handler) {
                    const result = actionConfig.handler(notificationId, notification);
                    if (result !== false) {
                        this.hide(notificationId);
                    }
                }
            }
        });
    }

    // ========== MASQUAGE ==========
    hide(id) {
        const notificationData = this.notifications.get(id);
        if (!notificationData) return;

        const { element, config } = notificationData;

        // Animation de sortie
        element.classList.add('hiding');

        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.notifications.delete(id);

            // Callback onClose
            if (config.onClose) {
                config.onClose(id);
            }
        }, 300);
    }

    // ========== GESTION MULTIPLE ==========
    hideAll() {
        this.notifications.forEach((_, id) => {
            this.hide(id);
        });
    }

    hideByType(type) {
        this.notifications.forEach((data, id) => {
            if (data.element.dataset.type === type) {
                this.hide(id);
            }
        });
    }

    limitNotifications() {
        if (this.notifications.size > this.maxNotifications) {
            // Supprimer les plus anciennes
            const sorted = Array.from(this.notifications.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            const toRemove = sorted.slice(0, this.notifications.size - this.maxNotifications);
            toRemove.forEach(([id]) => this.hide(id));
        }
    }

    // ========== MÉTHODES RACCOURCIES ==========
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    error(message, options = {}) {
        return this.show(message, 'error', {
            duration: 8000,
            ...options
        });
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    loading(message, options = {}) {
        return this.show(message, 'loading', {
            persistent: true,
            icon: '<div class="spinner"></div>',
            ...options
        });
    }

    // ========== NOTIFICATIONS AVANCÉES ==========
    confirm(message, title = 'Confirmation') {
        return new Promise((resolve) => {
            this.show(message, 'warning', {
                title,
                persistent: true,
                actions: [
                    {
                        label: 'Annuler',
                        action: 'cancel',
                        color: '#6b7280',
                        handler: () => resolve(false)
                    },
                    {
                        label: 'Confirmer',
                        action: 'confirm',
                        color: '#ef4444',
                        handler: () => resolve(true)
                    }
                ]
            });
        });
    }

    progress(message, title = 'Progression') {
        const id = this.show(message, 'info', {
            title,
            persistent: true,
            icon: '<div class="progress-circle"><span>0%</span></div>'
        });

        return {
            update: (percent, newMessage) => {
                const notification = this.notifications.get(id);
                if (notification) {
                    const progressEl = notification.element.querySelector('.progress-circle span');
                    if (progressEl) {
                        progressEl.textContent = `${Math.round(percent)}%`;
                    }
                    
                    if (newMessage) {
                        const messageEl = notification.element.querySelector('.notification-message');
                        if (messageEl) {
                            messageEl.textContent = newMessage;
                        }
                    }
                }
            },
            complete: (finalMessage = 'Terminé !') => {
                this.hide(id);
                this.success(finalMessage);
            },
            error: (errorMessage = 'Erreur') => {
                this.hide(id);
                this.error(errorMessage);
            }
        };
    }

    // ========== UTILITAIRES ==========
    generateId() {
        return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    getDefaultIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            loading: '<div class="spinner"></div>'
        };
        return icons[type] || icons.info;
    }

    // ========== CONFIGURATION ==========
    setPosition(position) {
        this.position = position;
        this.container.className = `notification-container ${position}`;
    }

    setMaxNotifications(max) {
        this.maxNotifications = max;
        this.limitNotifications();
    }

    setDefaultDuration(duration) {
        this.defaultDuration = duration;
    }

    // ========== GETTERS ==========
    getAll() {
        return Array.from(this.notifications.values());
    }

    getById(id) {
        return this.notifications.get(id);
    }

    count() {
        return this.notifications.size;
    }
}

// Styles CSS pour les notifications
export const notificationStyles = `
.notification-container {
    position: fixed;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 400px;
    width: 100%;
}

.notification-container.top-right {
    top: 20px;
    right: 20px;
}

.notification-container.top-left {
    top: 20px;
    left: 20px;
}

.notification-container.bottom-right {
    bottom: 20px;
    right: 20px;
}

.notification-container.bottom-left {
    bottom: 20px;
    left: 20px;
}

.notification {
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    transform: translateX(100%);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    border-left: 4px solid transparent;
}

.notification.visible {
    transform: translateX(0);
}

.notification.hiding {
    transform: translateX(100%);
    opacity: 0;
}

.notification-success {
    border-left-color: #10b981;
}

.notification-error {
    border-left-color: #ef4444;
}

.notification-warning {
    border-left-color: #f59e0b;
}

.notification-info {
    border-left-color: #6366f1;
}

.notification-loading {
    border-left-color: #8b5cf6;
}

.notification-content {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
}

.notification-icon {
    flex-shrink: 0;
    font-size: 20px;
    margin-top: 2px;
}

.notification-text {
    flex: 1;
}

.notification-title {
    font-weight: 600;
    font-size: 14px;
    color: #1f2937;
    margin-bottom: 4px;
}

.notification-message {
    font-size: 14px;
    color: #6b7280;
    line-height: 1.4;
}

.notification-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.notification-action {
    background: #6366f1;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.notification-action:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.notification-close {
    background: none;
    border: none;
    color: #9ca3af;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.notification-close:hover {
    background: #f3f4f6;
    color: #6b7280;
}

.notification-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: rgba(0, 0, 0, 0.1);
}

.notification-progress-bar {
    height: 100%;
    background: currentColor;
    animation: progress-countdown linear forwards;
    transform-origin: left;
}

@keyframes progress-countdown {
    from { width: 100%; }
    to { width: 0%; }
}

.spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #e5e7eb;
    border-top: 2px solid #6366f1;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.progress-circle {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
    color: #6366f1;
}

@media (max-width: 640px) {
    .notification-container {
        left: 10px !important;
        right: 10px !important;
        max-width: none;
    }
    
    .notification-content {
        padding: 12px;
    }
}
`;

// Injecter les styles
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = notificationStyles;
    document.head.appendChild(styleSheet);
}

// Instance singleton
const notificationManager = new NotificationManager();

export default notificationManager;