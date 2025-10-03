// Module UI et composants réutilisables
export class UIManager {
    constructor() {
        this.activeScreen = null;
        this.notifications = [];
        this.modals = [];
        this.loadingStates = new Map();
    }

    // ========== GESTION DES ÉCRANS ==========
    showScreen(screenId) {
        // Masquer tous les écrans
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Afficher l'écran demandé
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.activeScreen = screenId;
            
            // Déclencher événement de changement d'écran
            this.dispatchScreenChange(screenId);
        }
    }

    getCurrentScreen() {
        return this.activeScreen;
    }

    dispatchScreenChange(screenId) {
        const event = new CustomEvent('screenChange', { 
            detail: { screenId, previousScreen: this.activeScreen } 
        });
        document.dispatchEvent(event);
    }

    // ========== SYSTÈME DE NOTIFICATIONS ==========
    showNotification(message, type = 'success', duration = 3000) {
        const notificationId = Date.now() + Math.random();
        
        const notification = {
            id: notificationId,
            message,
            type,
            duration,
            timestamp: new Date()
        };

        this.notifications.push(notification);
        this.renderNotification(notification);

        // Auto-suppression
        if (duration > 0) {
            setTimeout(() => {
                this.hideNotification(notificationId);
            }, duration);
        }

        return notificationId;
    }

    renderNotification(notification) {
        const container = this.getNotificationContainer();
        
        const notificationEl = document.createElement('div');
        notificationEl.className = `notification ${notification.type} show`;
        notificationEl.id = `notification-${notification.id}`;
        notificationEl.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(notification.type)}</span>
                <span class="notification-message">${notification.message}</span>
                <button class="notification-close" onclick="uiManager.hideNotification(${notification.id})">×</button>
            </div>
        `;

        container.appendChild(notificationEl);

        // Animation d'entrée
        requestAnimationFrame(() => {
            notificationEl.classList.add('visible');
        });
    }

    hideNotification(notificationId) {
        const notificationEl = document.getElementById(`notification-${notificationId}`);
        
        if (notificationEl) {
            notificationEl.classList.remove('visible');
            notificationEl.classList.add('hiding');
            
            setTimeout(() => {
                notificationEl.remove();
            }, 300);
        }

        // Supprimer de la liste
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
    }

    getNotificationContainer() {
        let container = document.getElementById('notifications-container');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'notifications-container';
            container.className = 'notifications-container';
            document.body.appendChild(container);
        }

        return container;
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    // ========== SYSTÈME DE LOADING ==========
    setLoading(elementId, loading = true, text = 'Chargement...') {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (loading) {
            // Sauvegarder l'état original
            this.loadingStates.set(elementId, {
                originalText: element.innerHTML,
                originalDisabled: element.disabled
            });

            element.innerHTML = `<span class="loading-spinner"></span> ${text}`;
            element.disabled = true;
            element.classList.add('loading');
        } else {
            // Restaurer l'état original
            const originalState = this.loadingStates.get(elementId);
            if (originalState) {
                element.innerHTML = originalState.originalText;
                element.disabled = originalState.originalDisabled;
                this.loadingStates.delete(elementId);
            }
            element.classList.remove('loading');
        }
    }

    // ========== SYSTÈME DE MODAL ==========
    showModal(content, options = {}) {
        const modalId = `modal-${Date.now()}`;
        const {
            title = '',
            closeButton = true,
            backdrop = true,
            size = 'medium'
        } = options;

        const modalHtml = `
            <div class="modal-overlay ${backdrop ? 'with-backdrop' : ''}" id="${modalId}">
                <div class="modal-content ${size}">
                    <div class="modal-header">
                        <h3 class="modal-title">${title}</h3>
                        ${closeButton ? `<button class="modal-close" onclick="uiManager.hideModal('${modalId}')">&times;</button>` : ''}
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = document.getElementById(modalId);
        this.modals.push({ id: modalId, element: modal });

        // Animation d'ouverture
        requestAnimationFrame(() => {
            modal.classList.add('visible');
        });

        // Fermeture par clic sur backdrop
        if (backdrop) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modalId);
                }
            });
        }

        return modalId;
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hiding');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }

        this.modals = this.modals.filter(m => m.id !== modalId);
    }

    // ========== COMPOSANTS FORMULAIRES ==========
    createFormField(config) {
        const {
            type = 'text',
            name,
            label,
            placeholder = '',
            required = false,
            validation = null,
            value = ''
        } = config;

        const fieldId = `field-${name}`;
        
        let inputHtml = '';
        
        switch (type) {
            case 'select':
                inputHtml = `
                    <select id="${fieldId}" name="${name}" ${required ? 'required' : ''}>
                        ${config.options.map(opt => 
                            `<option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>${opt.label}</option>`
                        ).join('')}
                    </select>
                `;
                break;
                
            case 'textarea':
                inputHtml = `
                    <textarea id="${fieldId}" name="${name}" placeholder="${placeholder}" 
                              ${required ? 'required' : ''}>${value}</textarea>
                `;
                break;
                
            default:
                inputHtml = `
                    <input type="${type}" id="${fieldId}" name="${name}" 
                           placeholder="${placeholder}" value="${value}" 
                           ${required ? 'required' : ''}>
                `;
        }

        return `
            <div class="form-group">
                <label for="${fieldId}">${label} ${required ? '<span class="required">*</span>' : ''}</label>
                ${inputHtml}
                <div class="field-error" id="${fieldId}-error"></div>
            </div>
        `;
    }

    validateField(fieldId, validator) {
        const field = document.getElementById(fieldId);
        const errorEl = document.getElementById(`${fieldId}-error`);
        
        if (!field || !errorEl) return true;

        const value = field.value;
        const validation = validator(value);

        if (validation.valid) {
            field.classList.remove('error');
            errorEl.textContent = '';
            errorEl.style.display = 'none';
            return true;
        } else {
            field.classList.add('error');
            errorEl.textContent = validation.message;
            errorEl.style.display = 'block';
            return false;
        }
    }

    // ========== TABLEAUX DE DONNÉES ==========
    createDataTable(container, data, columns, options = {}) {
        const {
            sortable = true,
            searchable = true,
            pagination = true,
            pageSize = 10
        } = options;

        let tableHtml = '';

        if (searchable) {
            tableHtml += `
                <div class="table-controls">
                    <input type="text" class="table-search" placeholder="Rechercher..." 
                           onkeyup="uiManager.filterTable(this, '${container}')">
                </div>
            `;
        }

        tableHtml += `
            <table class="data-table" id="${container}-table">
                <thead>
                    <tr>
                        ${columns.map(col => `
                            <th ${sortable ? `onclick="uiManager.sortTable('${container}', '${col.key}')"` : ''}>
                                ${col.label}
                                ${sortable ? '<span class="sort-icon"></span>' : ''}
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${this.renderTableRows(data, columns)}
                </tbody>
            </table>
        `;

        if (pagination && data.length > pageSize) {
            tableHtml += this.createPagination(data.length, pageSize);
        }

        document.getElementById(container).innerHTML = tableHtml;
    }

    renderTableRows(data, columns) {
        return data.map(row => `
            <tr>
                ${columns.map(col => `
                    <td>${this.formatCellValue(row[col.key], col.type || 'text')}</td>
                `).join('')}
            </tr>
        `).join('');
    }

    formatCellValue(value, type) {
        switch (type) {
            case 'date':
                return new Date(value).toLocaleDateString('fr-FR');
            case 'datetime':
                return new Date(value).toLocaleString('fr-FR');
            case 'currency':
                return new Intl.NumberFormat('fr-FR', { 
                    style: 'currency', 
                    currency: 'EUR' 
                }).format(value);
            case 'percentage':
                return `${value}%`;
            case 'boolean':
                return value ? '✅' : '❌';
            default:
                return value || '-';
        }
    }

    // ========== GRAPHIQUES ==========
    async createChart(containerId, type, data, options = {}) {
        // Vérifier si Chart.js est disponible
        if (typeof Chart === 'undefined') {
            console.error('Chart.js non disponible');
            return null;
        }

        const canvas = document.createElement('canvas');
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        container.appendChild(canvas);

        const config = {
            type,
            data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                ...options
            }
        };

        return new Chart(canvas.getContext('2d'), config);
    }

    // ========== UTILITAIRES ==========
    formatDate(date, format = 'short') {
        const d = new Date(date);
        
        switch (format) {
            case 'short':
                return d.toLocaleDateString('fr-FR');
            case 'long':
                return d.toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            case 'time':
                return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            case 'datetime':
                return d.toLocaleString('fr-FR');
            default:
                return d.toLocaleDateString('fr-FR');
        }
    }

    formatNumber(number, decimals = 0) {
        return new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(number);
    }

    // ========== ANIMATIONS ==========
    fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        let start = null;
        
        function animate(timestamp) {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            
            element.style.opacity = Math.min(progress / duration, 1);
            
            if (progress < duration) {
                requestAnimationFrame(animate);
            }
        }
        
        requestAnimationFrame(animate);
    }

    fadeOut(element, duration = 300) {
        let start = null;
        
        function animate(timestamp) {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            
            element.style.opacity = Math.max(1 - (progress / duration), 0);
            
            if (progress < duration) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
            }
        }
        
        requestAnimationFrame(animate);
    }

    slideUp(element, duration = 300) {
        const height = element.offsetHeight;
        element.style.height = height + 'px';
        element.style.overflow = 'hidden';
        
        let start = null;
        
        function animate(timestamp) {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            
            const currentHeight = height * (1 - (progress / duration));
            element.style.height = Math.max(currentHeight, 0) + 'px';
            
            if (progress < duration) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
                element.style.height = '';
                element.style.overflow = '';
            }
        }
        
        requestAnimationFrame(animate);
    }

    // ========== THÈMES ==========
    setTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        localStorage.setItem('theme', themeName);
    }

    getTheme() {
        return localStorage.getItem('theme') || 'light';
    }

    toggleTheme() {
        const currentTheme = this.getTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
        return newTheme;
    }
}

// ========== FONCTIONS UTILITAIRES GLOBALES ==========
export function showNotification(message, type = 'success', duration = 3000) {
    return window.uiManager?.showNotification(message, type, duration);
}

export function showScreen(screenId) {
    return window.uiManager?.showScreen(screenId);
}

export function setLoading(elementId, loading = true, text = 'Chargement...') {
    return window.uiManager?.setLoading(elementId, loading, text);
}

export function showModal(content, options = {}) {
    return window.uiManager?.showModal(content, options);
}

export function hideModal(modalId) {
    return window.uiManager?.hideModal(modalId);
}

// Instance singleton
const uiManager = new UIManager();

// Rendre disponible globalement
if (typeof window !== 'undefined') {
    window.uiManager = uiManager;
}

export default uiManager;