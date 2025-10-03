// Validations et sanitisation avancées
export class Validators {
    // ========== VALIDATION EMAIL ==========
    static validateEmail(email) {
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

        if (!email || typeof email !== 'string') {
            return { valid: false, message: 'Email requis' };
        }

        if (email.length > 254) {
            return { valid: false, message: 'Email trop long (max 254 caractères)' };
        }

        if (!emailRegex.test(email)) {
            return { valid: false, message: 'Format email invalide (ex: nom@domaine.com)' };
        }

        return { valid: true, message: 'Email valide' };
    }

    // ========== VALIDATION MOT DE PASSE ==========
    static validatePassword(password) {
        if (!password || typeof password !== 'string') {
            return { valid: false, message: 'Mot de passe requis' };
        }

        // Longueur minimale réduite à 6
        if (password.length < 6) {
            return { valid: false, message: 'Le mot de passe doit contenir au moins 6 caractères' };
        }

        // Longueur maximale (sécurité)
        if (password.length > 128) {
            return { valid: false, message: 'Le mot de passe est trop long (max 128 caractères)' };
        }

        // Au moins une lettre (majuscule OU minuscule)
        if (!/[a-zA-Z]/.test(password)) {
            return { valid: false, message: 'Le mot de passe doit contenir au moins une lettre' };
        }

        // Au moins un chiffre
        if (!/\d/.test(password)) {
            return { valid: false, message: 'Le mot de passe doit contenir au moins un chiffre' };
        }

        // Caractères spéciaux optionnels (on ne les oblige plus)

        return { valid: true, value: password };
    }

    // ========== VALIDATION NOM ==========
    static validateName(name) {
        if (!name || typeof name !== 'string') {
            return { valid: false, message: 'Nom requis' };
        }

        const trimmedName = name.trim();

        if (trimmedName.length < 2) {
            return { valid: false, message: 'Nom trop court (minimum 2 caractères)' };
        }

        if (trimmedName.length > 50) {
            return { valid: false, message: 'Nom trop long (maximum 50 caractères)' };
        }

        // Vérifier caractères autorisés (lettres, espaces, apostrophes, tirets)
        if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(trimmedName)) {
            return { valid: false, message: 'Nom contient des caractères non autorisés' };
        }

        return { valid: true, message: 'Nom valide', value: trimmedName };
    }

    // ========== VALIDATION TITRE CHALLENGE ==========
    static validateChallengeTitle(title) {
        if (!title || typeof title !== 'string') {
            return { valid: false, message: 'Titre du challenge requis' };
        }

        const trimmedTitle = title.trim();

        if (trimmedTitle.length < 5) {
            return { valid: false, message: 'Titre trop court (minimum 5 caractères)' };
        }

        if (trimmedTitle.length > 100) {
            return { valid: false, message: 'Titre trop long (maximum 100 caractères)' };
        }

        // Vérifier qu'il y a au moins des caractères alphanumériques
        if (!/[a-zA-Z0-9À-ÿ]/.test(trimmedTitle)) {
            return { valid: false, message: 'Le titre doit contenir au moins des caractères alphanumériques' };
        }

        return { valid: true, message: 'Titre valide', value: trimmedTitle };
    }

    // ========== VALIDATION DURÉE ==========
    static validateDuration(duration) {
        const numDuration = parseInt(duration);

        if (isNaN(numDuration) || numDuration <= 0) {
            return { valid: false, message: 'Durée invalide' };
        }

        if (numDuration < 1) {
            return { valid: false, message: 'Durée minimum : 1 jour' };
        }

        if (numDuration > 365) {
            return { valid: false, message: 'Durée maximum : 365 jours' };
        }

        return { valid: true, message: 'Durée valide', value: numDuration };
    }

    // ========== VALIDATION JOURS PERSONNALISÉS ==========
    static validateCustomDays(days) {
        if (!Array.isArray(days)) {
            return { valid: false, message: 'Format de jours invalide' };
        }

        if (days.length === 0) {
            return { valid: false, message: 'Au moins un jour doit être sélectionné' };
        }

        if (days.length > 7) {
            return { valid: false, message: 'Maximum 7 jours autorisés' };
        }

        // Vérifier que tous les jours sont valides (0-6)
        for (let day of days) {
            const numDay = parseInt(day);
            if (isNaN(numDay) || numDay < 0 || numDay > 6) {
                return { valid: false, message: 'Jours invalides (0-6 autorisés)' };
            }
        }

        // Éliminer les doublons
        const uniqueDays = [...new Set(days.map(d => parseInt(d)))];

        return { valid: true, message: 'Jours valides', value: uniqueDays };
    }

    // ========== SANITISATION XSS ==========
    static sanitizeHtml(input) {
        if (!input || typeof input !== 'string') {
            return '';
        }

        // Remplacer les caractères HTML dangereux
        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .replace(/&/g, '&amp;');
    }

    // ========== SANITISATION TEXTE GÉNÉRAL ==========
    static sanitizeText(input, maxLength = 1000) {
        if (!input || typeof input !== 'string') {
            return '';
        }

        // Nettoyer et limiter la longueur
        let sanitized = input
            .trim()
            .substring(0, maxLength)
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Caractères de contrôle
            .replace(/\s+/g, ' '); // Espaces multiples

        return this.sanitizeHtml(sanitized);
    }

    // ========== VALIDATION COMPLÈTE FORMULAIRE ==========
    static validateSignupForm(formData) {
        const errors = [];
        const sanitizedData = {};

        // Validation nom
        const nameValidation = this.validateName(formData.name);
        if (!nameValidation.valid) {
            errors.push({ field: 'name', message: nameValidation.message });
        } else {
            sanitizedData.name = nameValidation.value;
        }

        // Validation email
        const emailValidation = this.validateEmail(formData.email);
        if (!emailValidation.valid) {
            errors.push({ field: 'email', message: emailValidation.message });
        } else {
            sanitizedData.email = formData.email.toLowerCase().trim();
        }

        // Validation mot de passe
        const passwordValidation = this.validatePassword(formData.password);
        if (!passwordValidation.valid) {
            errors.push({ field: 'password', message: passwordValidation.message });
        } else {
            sanitizedData.password = formData.password;
        }

        return {
            valid: errors.length === 0,
            errors,
            data: sanitizedData
        };
    }

    static validateLoginForm(formData) {
        const errors = [];
        const sanitizedData = {};

        // Validation email
        const emailValidation = this.validateEmail(formData.email);
        if (!emailValidation.valid) {
            errors.push({ field: 'email', message: emailValidation.message });
        } else {
            sanitizedData.email = formData.email.toLowerCase().trim();
        }

        // Validation mot de passe (plus souple pour login)
        if (!formData.password || formData.password.length < 1) {
            errors.push({ field: 'password', message: 'Mot de passe requis' });
        } else {
            sanitizedData.password = formData.password;
        }

        return {
            valid: errors.length === 0,
            errors,
            data: sanitizedData
        };
    }

    static validateChallengeForm(formData) {
        const errors = [];
        const sanitizedData = {};

        // Validation titre
        const titleValidation = this.validateChallengeTitle(formData.title);
        if (!titleValidation.valid) {
            errors.push({ field: 'title', message: titleValidation.message });
        } else {
            sanitizedData.title = titleValidation.value;
        }

        // Validation durée
        const durationValidation = this.validateDuration(formData.duration);
        if (!durationValidation.valid) {
            errors.push({ field: 'duration', message: durationValidation.message });
        } else {
            sanitizedData.duration = durationValidation.value;
        }

        // Validation email témoin
        const witnessEmailValidation = this.validateEmail(formData.witnessEmail);
        if (!witnessEmailValidation.valid) {
            errors.push({ field: 'witnessEmail', message: 'Email témoin: ' + witnessEmailValidation.message });
        } else {
            sanitizedData.witnessEmail = formData.witnessEmail.toLowerCase().trim();
        }

        // Validation fréquence
        if (!formData.frequency || !['daily', 'custom'].includes(formData.frequency)) {
            errors.push({ field: 'frequency', message: 'Fréquence invalide' });
        } else {
            sanitizedData.frequency = formData.frequency;
        }

        // Validation jours personnalisés si nécessaire
        if (formData.frequency === 'custom') {
            const daysValidation = this.validateCustomDays(formData.customDays || []);
            if (!daysValidation.valid) {
                errors.push({ field: 'customDays', message: daysValidation.message });
            } else {
                sanitizedData.customDays = daysValidation.value;
            }
        }

        // Validation gage
        if (!formData.gage || formData.gage.trim().length === 0) {
            errors.push({ field: 'gage', message: 'Gage requis' });
        } else {
            sanitizedData.gage = this.sanitizeText(formData.gage, 500);
        }

        return {
            valid: errors.length === 0,
            errors,
            data: sanitizedData
        };
    }

    // ========== VALIDATION RATE LIMITING ==========
    static rateLimitData = new Map();

    static checkRateLimit(identifier, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
        const now = Date.now();
        const userAttempts = this.rateLimitData.get(identifier) || { count: 0, resetTime: now + windowMs };

        // Reset si la fenêtre est expirée
        if (now > userAttempts.resetTime) {
            userAttempts.count = 0;
            userAttempts.resetTime = now + windowMs;
        }

        // Vérifier si limite atteinte
        if (userAttempts.count >= maxAttempts) {
            const resetInMinutes = Math.ceil((userAttempts.resetTime - now) / 60000);
            return {
                allowed: false,
                message: `Trop de tentatives. Réessayez dans ${resetInMinutes} minutes.`,
                resetTime: userAttempts.resetTime
            };
        }

        // Incrémenter le compteur
        userAttempts.count++;
        this.rateLimitData.set(identifier, userAttempts);

        return {
            allowed: true,
            remaining: maxAttempts - userAttempts.count,
            resetTime: userAttempts.resetTime
        };
    }

    // ========== VALIDATION FILE UPLOAD ==========
    static validateFile(file, options = {}) {
        const {
            maxSize = 5 * 1024 * 1024, // 5MB par défaut
            allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
            allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp']
        } = options;

        if (!file) {
            return { valid: false, message: 'Fichier requis' };
        }

        // Vérifier la taille
        if (file.size > maxSize) {
            const maxSizeMB = Math.round(maxSize / (1024 * 1024));
            return { valid: false, message: `Fichier trop volumineux (max ${maxSizeMB}MB)` };
        }

        // Vérifier le type MIME
        if (!allowedTypes.includes(file.type)) {
            return { valid: false, message: `Type de fichier non autorisé. Types acceptés: ${allowedTypes.join(', ')}` };
        }

        // Vérifier l'extension
        const fileName = file.name.toLowerCase();
        const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

        if (!hasValidExtension) {
            return { valid: false, message: `Extension non autorisée. Extensions acceptées: ${allowedExtensions.join(', ')}` };
        }

        return { valid: true, message: 'Fichier valide' };
    }
}

export default Validators;