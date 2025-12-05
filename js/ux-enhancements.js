/**
 * UX Enhancements Module - Production-Grade UI Utilities
 * Provides toast notifications, loading states, ripple effects, and more
 */

// ============================================
// TOAST NOTIFICATION SYSTEM
// ============================================

class ToastNotificationManager {
    constructor() {
        this.toastContainer = this.createToastContainer();
        this.activeToasts = new Set();
    }

    createToastContainer() {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            container.setAttribute('role', 'region');
            container.setAttribute('aria-label', 'Notifications');
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - Type of toast: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duration in milliseconds (default: 3000)
     */
    show(message, type = 'info', duration = 3000) {
        const toast = this.createToast(message, type);
        this.activeToasts.add(toast);
        this.toastContainer.appendChild(toast);

        // Announce to screen readers
        this.announceToScreenReader(message);

        // Auto-dismiss after duration
        if (duration > 0) {
            setTimeout(() => this.dismiss(toast), duration);
        }

        return toast;
    }

    createToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        
        const icon = this.getIconForType(type);
        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${this.escapeHtml(message)}</span>
        `;

        // Allow manual dismiss on click
        toast.addEventListener('click', () => this.dismiss(toast));

        return toast;
    }

    dismiss(toast) {
        if (!this.activeToasts.has(toast)) return;

        toast.classList.add('toast-hide');
        this.activeToasts.delete(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 400);
    }

    getIconForType(type) {
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }

    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.className = 'sr-only';
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.textContent = message;
        document.body.appendChild(announcement);

        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Convenience methods
    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }

    dismissAll() {
        this.activeToasts.forEach(toast => this.dismiss(toast));
    }
}

// ============================================
// RIPPLE EFFECT SYSTEM
// ============================================

class RippleEffectManager {
    /**
     * Add ripple effect to an element
     * @param {HTMLElement} element - Target element
     * @param {MouseEvent|TouchEvent} event - Click/touch event
     */
    static addRipple(element, event) {
        // Ensure element has ripple-container class
        if (!element.classList.contains('ripple-container')) {
            element.classList.add('ripple-container');
        }

        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';

        const rect = element.getBoundingClientRect();
        const clientX = event.clientX || (event.touches && event.touches[0].clientX);
        const clientY = event.clientY || (event.touches && event.touches[0].clientY);
        
        const size = Math.max(rect.width, rect.height);
        const x = clientX - rect.left - size / 2;
        const y = clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;

        element.appendChild(ripple);

        // Remove ripple after animation completes
        ripple.addEventListener('animationend', () => {
            ripple.remove();
        });
    }

    /**
     * Initialize ripple effects on all elements with data-ripple attribute
     */
    static initializeRippleEffects() {
        document.addEventListener('click', (event) => {
            const target = event.target.closest('[data-ripple]');
            if (target) {
                RippleEffectManager.addRipple(target, event);
            }
        });
    }
}

// ============================================
// LOADING STATE MANAGER
// ============================================

class LoadingStateManager {
    /**
     * Show loading skeleton for an element
     * @param {HTMLElement} element - Target element
     * @param {string} skeletonType - Type of skeleton: 'problem', 'solution', 'custom'
     */
    static showLoadingSkeleton(element, skeletonType = 'custom') {
        const originalContent = element.innerHTML;
        element.dataset.originalContent = originalContent;

        const skeleton = document.createElement('div');
        skeleton.className = `loading-skeleton ${skeletonType}-loading-skeleton`;
        skeleton.setAttribute('aria-label', 'Loading...');
        skeleton.setAttribute('role', 'status');

        element.innerHTML = '';
        element.appendChild(skeleton);
    }

    /**
     * Hide loading skeleton and restore content
     * @param {HTMLElement} element - Target element
     */
    static hideLoadingSkeleton(element) {
        const originalContent = element.dataset.originalContent;
        if (originalContent !== undefined) {
            element.innerHTML = originalContent;
            delete element.dataset.originalContent;
        }
    }

    /**
     * Show loading spinner in an element
     * @param {HTMLElement} element - Target element
     * @param {string} message - Optional loading message
     */
    static showLoadingSpinner(element, message = 'Loading...') {
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner-container';
        spinner.innerHTML = `
            <div class="loading-spinner"></div>
            ${message ? `<p class="loading-message">${message}</p>` : ''}
        `;
        spinner.setAttribute('role', 'status');
        spinner.setAttribute('aria-label', message);

        element.dataset.originalContent = element.innerHTML;
        element.innerHTML = '';
        element.appendChild(spinner);
    }

    /**
     * Hide loading spinner and restore content
     * @param {HTMLElement} element - Target element
     */
    static hideLoadingSpinner(element) {
        this.hideLoadingSkeleton(element);
    }
}

// ============================================
// PROGRESS BAR MANAGER
// ============================================

class ProgressBarManager {
    constructor(container) {
        this.container = container;
        this.progressBar = this.createProgressBar();
        this.currentProgress = 0;
    }

    createProgressBar() {
        const bar = document.createElement('div');
        bar.className = 'progress-bar';
        bar.setAttribute('role', 'progressbar');
        bar.setAttribute('aria-valuemin', '0');
        bar.setAttribute('aria-valuemax', '100');
        
        const fill = document.createElement('div');
        fill.className = 'progress-bar-fill progress-bar-animated';
        bar.appendChild(fill);

        this.container.appendChild(bar);
        return bar;
    }

    /**
     * Update progress bar
     * @param {number} progress - Progress value (0-100)
     */
    setProgress(progress) {
        this.currentProgress = Math.max(0, Math.min(100, progress));
        const fill = this.progressBar.querySelector('.progress-bar-fill');
        fill.style.width = `${this.currentProgress}%`;
        
        this.progressBar.setAttribute('aria-valuenow', this.currentProgress);
        this.progressBar.setAttribute('aria-label', `Progress: ${this.currentProgress}%`);
    }

    /**
     * Reset progress bar to 0
     */
    reset() {
        this.setProgress(0);
    }

    /**
     * Complete progress bar (set to 100%)
     */
    complete() {
        this.setProgress(100);
    }

    /**
     * Remove progress bar from DOM
     */
    destroy() {
        if (this.progressBar && this.progressBar.parentNode) {
            this.progressBar.parentNode.removeChild(this.progressBar);
        }
    }
}

// ============================================
// LAZY LOADING UTILITIES
// ============================================

class LazyLoadManager {
    /**
     * Lazy load images when they come into viewport
     */
    static initializeLazyImages() {
        const images = document.querySelectorAll('img[data-src]');
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                });
            });

            images.forEach(img => imageObserver.observe(img));
        } else {
            // Fallback for older browsers
            images.forEach(img => {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
            });
        }
    }

    /**
     * Preload critical resources
     * @param {Array<string>} urls - Array of URLs to preload
     * @param {string} type - Resource type: 'image', 'script', 'style'
     */
    static preloadResources(urls, type = 'image') {
        const typeMap = {
            image: 'image',
            script: 'script',
            style: 'style'
        };

        urls.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = typeMap[type];
            link.href = url;
            document.head.appendChild(link);
        });
    }

    /**
     * Load script dynamically
     * @param {string} url - Script URL
     * @returns {Promise} - Promise that resolves when script loads
     */
    static loadScriptAsync(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
}

// ============================================
// ACCESSIBILITY UTILITIES
// ============================================

class AccessibilityManager {
    /**
     * Announce message to screen readers
     * @param {string} message - Message to announce
     * @param {string} priority - 'polite' or 'assertive'
     */
    static announce(message, priority = 'polite') {
        const announcement = document.createElement('div');
        announcement.className = 'sr-only';
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', priority);
        announcement.textContent = message;
        document.body.appendChild(announcement);

        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    /**
     * Add skip link for keyboard navigation
     * @param {string} targetId - ID of main content
     */
    static addSkipLink(targetId = 'main-content') {
        const skipLink = document.createElement('a');
        skipLink.href = `#${targetId}`;
        skipLink.className = 'skip-link';
        skipLink.textContent = 'Skip to main content';
        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    /**
     * Trap focus within a modal/dialog
     * @param {HTMLElement} element - Modal element
     */
    static trapFocus(element) {
        const focusableElements = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        element.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        lastFocusable.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        firstFocusable.focus();
                        e.preventDefault();
                    }
                }
            }
        });

        firstFocusable.focus();
    }
}

// ============================================
// INITIALIZE AND EXPORT
// ============================================

// Create global instances
const toastManager = new ToastNotificationManager();

// Initialize ripple effects on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        RippleEffectManager.initializeRippleEffects();
        LazyLoadManager.initializeLazyImages();
    });
} else {
    RippleEffectManager.initializeRippleEffects();
    LazyLoadManager.initializeLazyImages();
}

// Export to window for global access
window.UXEnhancements = {
    toast: toastManager,
    ripple: RippleEffectManager,
    loading: LoadingStateManager,
    ProgressBar: ProgressBarManager,
    lazyLoad: LazyLoadManager,
    accessibility: AccessibilityManager
};

console.log('✨ UX Enhancements Module loaded successfully');
