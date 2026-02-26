/**
 * ZX Story Flow - Internationalization (i18n) Engine
 */

class Translator {
    constructor() {
        this.currentLang = 'es';
        this.translations = {};
        this.observer = null;
    }

    async init() {
        // Load preference from localStorage or default to browser language or 'es'
        const savedLang = localStorage.getItem('zx_story_flow_lang');
        const browserLang = navigator.language.split('-')[0];
        const defaultLang = savedLang || (['es', 'en', 'pt'].includes(browserLang) ? browserLang : 'es');

        await this.loadLanguage(defaultLang);
        this.setupObserver();
    }

    async loadLanguage(lang) {
        try {
            const response = await fetch(`lang/${lang}.json`);
            if (!response.ok) throw new Error(`Could not load language ${lang}`);
            this.translations = await response.json();
            this.currentLang = lang;
            localStorage.setItem('zx_story_flow_lang', lang);
            this.updateUI();

            // Dispatch event for components that need to re-render
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
        } catch (error) {
            console.error('Translation error:', error);
        }
    }

    t(key) {
        const keys = key.split('.');
        let result = this.translations;
        for (const k of keys) {
            if (result && result[k]) {
                result = result[k];
            } else {
                console.warn(`Translation key not found: ${key}`);
                return key;
            }
        }
        return result;
    }

    updateUI(container = document) {
        const elements = container.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);

            if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'password' || el.type === 'email')) {
                el.placeholder = translation;
            } else if (el.hasAttribute('title')) {
                el.title = translation;
            } else {
                // Preserving HTML if needed, otherwise textContent is safer
                if (el.getAttribute('data-i18n-html') === 'true') {
                    el.innerHTML = translation;
                } else {
                    // Special case for buttons with icons: we might want to preserve the icon
                    // For now, if it contains an emoji at the start, we might need special handling
                    // or just use data-i18n on a span inside the button.
                    el.textContent = translation;
                }
            }
        });
    }

    // Observe DOM changes to automatically translate new elements
    setupObserver() {
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        if (node.hasAttribute('data-i18n')) {
                            this.updateUI(node.parentElement || node);
                        } else {
                            this.updateUI(node);
                        }
                    }
                });
            });
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

export const i18n = new Translator();
export const t = (key) => i18n.t(key);
