// Composant Modal réutilisable
export class Modal {
    constructor(options = {}) {
        this.id = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.options = {
            title: '',
            content: '',
            showClose: true,
            backdrop: true,
            size: 'medium',
            animation: 'fade',
            onShow: null,
            onHide: null,
            onConfirm: null,
            onCancel: null,
            ...options
        };
        this.isVisible = false;
        this.element = null;
    }

    // ========== CRÉATION MODAL ==========
    create() {
        const modal = document.createElement('div');
        modal.id = this.id;
        modal.className = `modal-overlay ${this.options.size}`;
        
        if (this.options.backdrop) {
            modal.classList.add('with-backdrop');
        }

        modal.innerHTML = this.getModalHTML();
        
        // Ajouter event listeners
        this.attachEventListeners(modal);
        
        this.element = modal;
        return modal;
    }

    getModalHTML() {
        const { title, content, showClose } = this.options;
        
        return `
            <div class="modal-content" data-animation="${this.options.animation}">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    ${showClose ? '<button class="modal-close" data-action="close">&times;</button>' : ''}
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    <slot name="footer"></slot>
                </div>
            </div>
        `;
    }

    // ========== EVENT LISTENERS ==========
    attachEventListeners(modal) {
        // Fermeture par backdrop
        if (this.options.backdrop) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hide();
                }
            });
        }

        // Fermeture par bouton close
        const closeBtn = modal.querySelector('[data-action="close"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        // Fermeture par Escape
        document.addEventListener('keydown', this.handleKeydown.bind(this));

        // Boutons confirm/cancel
        const confirmBtn = modal.querySelector('[data-action="confirm"]');
        const cancelBtn = modal.querySelector('[data-action="cancel"]');
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.confirm());
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancel());
        }
    }

    handleKeydown(e) {
        if (e.key === 'Escape' && this.isVisible) {
            this.hide();
        }
    }

    // ========== AFFICHAGE ==========
    show() {
        if (this.isVisible) return;

        // Créer l'élément si nécessaire
        if (!this.element) {
            this.create();
        }

        // Ajouter au DOM
        document.body.appendChild(this.element);
        
        // Forcer reflow pour l'animation
        this.element.offsetHeight;
        
        // Ajouter classe visible
        this.element.classList.add('visible');
        this.isVisible = true;

        // Gérer le focus
        this.trapFocus();

        // Callback onShow
        if (this.options.onShow) {
            this.options.onShow(this);
        }

        return this;
    }

    hide() {
        if (!this.isVisible) return;

        this.element.classList.add('hiding');
        this.element.classList.remove('visible');
        
        setTimeout(() => {
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
            this.isVisible = false;
            
            // Callback onHide
            if (this.options.onHide) {
                this.options.onHide(this);
            }
        }, 300);

        return this;
    }

    // ========== ACTIONS ==========
    confirm() {
        if (this.options.onConfirm) {
            const result = this.options.onConfirm(this);
            if (result !== false) {
                this.hide();
            }
        } else {
            this.hide();
        }
    }

    cancel() {
        if (this.options.onCancel) {
            const result = this.options.onCancel(this);
            if (result !== false) {
                this.hide();
            }
        } else {
            this.hide();
        }
    }

    // ========== MISE À JOUR CONTENU ==========
    setTitle(title) {
        const titleEl = this.element?.querySelector('.modal-title');
        if (titleEl) {
            titleEl.textContent = title;
        }
        this.options.title = title;
        return this;
    }

    setContent(content) {
        const bodyEl = this.element?.querySelector('.modal-body');
        if (bodyEl) {
            bodyEl.innerHTML = content;
        }
        this.options.content = content;
        return this;
    }

    setFooter(footer) {
        const footerEl = this.element?.querySelector('.modal-footer');
        if (footerEl) {
            footerEl.innerHTML = footer;
            // Réattacher les event listeners pour les nouveaux boutons
            this.attachEventListeners(this.element);
        }
        return this;
    }

    // ========== GESTION FOCUS ==========
    trapFocus() {
        const focusableElements = this.element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (firstElement) {
            firstElement.focus();
        }

        this.element.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        });
    }

    // ========== MÉTHODES STATIQUES ==========
    static alert(message, title = 'Information') {
        return new Modal({
            title,
            content: `<p>${message}</p>`,
            size: 'small'
        }).setFooter(`
            <button class="btn btn-primary" data-action="confirm">OK</button>
        `).show();
    }

    static confirm(message, title = 'Confirmation') {
        return new Promise((resolve) => {
            new Modal({
                title,
                content: `<p>${message}</p>`,
                size: 'small',
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false)
            }).setFooter(`
                <button class="btn btn-secondary" data-action="cancel">Annuler</button>
                <button class="btn btn-primary" data-action="confirm">Confirmer</button>
            `).show();
        });
    }

    static prompt(message, defaultValue = '', title = 'Saisie') {
        return new Promise((resolve) => {
            const inputId = `prompt-input-${Date.now()}`;
            
            new Modal({
                title,
                content: `
                    <p>${message}</p>
                    <input type="text" id="${inputId}" value="${defaultValue}" 
                           style="width: 100%; margin-top: 10px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                `,
                size: 'small',
                onConfirm: (modal) => {
                    const input = modal.element.querySelector(`#${inputId}`);
                    resolve(input ? input.value : null);
                },
                onCancel: () => resolve(null),
                onShow: (modal) => {
                    const input = modal.element.querySelector(`#${inputId}`);
                    if (input) {
                        input.focus();
                        input.select();
                    }
                }
            }).setFooter(`
                <button class="btn btn-secondary" data-action="cancel">Annuler</button>
                <button class="btn btn-primary" data-action="confirm">OK</button>
            `).show();
        });
    }

    static custom(options) {
        return new Modal(options);
    }

    // ========== UTILITAIRES ==========
    destroy() {
        if (this.element) {
            this.hide();
            document.removeEventListener('keydown', this.handleKeydown.bind(this));
        }
    }

    isOpen() {
        return this.isVisible;
    }

    getElement() {
        return this.element;
    }
}

// Styles CSS pour les modals
export const modalStyles = `
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.modal-overlay.visible {
    opacity: 1;
}

.modal-overlay.hiding {
    opacity: 0;
}

.modal-content {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    max-width: 90vw;
    max-height: 90vh;
    overflow: hidden;
    transform: scale(0.7) translateY(-20px);
    transition: transform 0.3s ease;
}

.modal-overlay.visible .modal-content {
    transform: scale(1) translateY(0);
}

.modal-overlay.small .modal-content {
    width: 400px;
}

.modal-overlay.medium .modal-content {
    width: 600px;
}

.modal-overlay.large .modal-content {
    width: 800px;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
}

.modal-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
}

.modal-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #6b7280;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.2s;
}

.modal-close:hover {
    background: #e5e7eb;
    color: #374151;
}

.modal-body {
    padding: 20px;
    overflow-y: auto;
    max-height: 60vh;
}

.modal-footer {
    padding: 20px;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
}

.modal-footer .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.modal-footer .btn-primary {
    background: #6366f1;
    color: white;
}

.modal-footer .btn-primary:hover {
    background: #4f46e5;
}

.modal-footer .btn-secondary {
    background: #e5e7eb;
    color: #374151;
}

.modal-footer .btn-secondary:hover {
    background: #d1d5db;
}

@media (max-width: 640px) {
    .modal-content {
        width: 95vw !important;
        margin: 20px;
    }
    
    .modal-header,
    .modal-body,
    .modal-footer {
        padding: 15px;
    }
}
`;

// Injecter les styles
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = modalStyles;
    document.head.appendChild(styleSheet);
}

export default Modal;