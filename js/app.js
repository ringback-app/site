const defaultLang = 'en';
const supportedLangs = ['en', 'it', 'fr', 'es'];
const STORAGE_KEY = 'rb_lang';

/**
 * Determines the initial language based on priority:
 * 1. URL Parameter (?lang=xx)
 * 2. LocalStorage (user preference)
 * 3. Browser Language (navigator.languages)
 * 4. Default (en)
 * @returns {string} The ISO language code (e.g., 'en', 'it')
 */
function getInitialLang() {
    // 1. Check URL param (Overrides everything for sharing purposes)
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    if (urlLang && supportedLangs.includes(urlLang)) return urlLang;

    // 2. Check LocalStorage (Persisted user choice)
    const storedLang = localStorage.getItem(STORAGE_KEY);
    if (storedLang && supportedLangs.includes(storedLang)) return storedLang;

    // 3. Check Browser preference (System settings)
    const browserLangs = navigator.languages || [navigator.language];
    for (const lang of browserLangs) {
        // Extract 'en' from 'en-US'
        const code = lang.slice(0, 2).toLowerCase();
        if (supportedLangs.includes(code)) return code;
    }

    // 4. Fallback
    return defaultLang;
}

/**
 * Fetches the JSON locale file and updates the DOM.
 * @param {string} lang 
 */
async function loadTranslations(lang) {
    try {
        const response = await fetch(`./locales/${lang}.json`);
        if (!response.ok) throw new Error(`Could not load ${lang}.json`);
        
        const translations = await response.json();
        applyTranslations(translations);
        
        // Update document state
        document.documentElement.lang = lang;
        const selector = document.getElementById('language-selector');
        if (selector) selector.value = lang;

    } catch (error) {
        console.error('Localization Error:', error);
    } finally {
        // Reveal content once translation logic is done (success or fail)
        // This prevents the FOUC (Flash of Untranslated Content) while maintaining
        // the "white page" loading experience requested.
        document.body.classList.remove('is-loading');
    }
}

/**
 * Traverses the DOM for [data-i18n] attributes and injects translated text.
 * Supports dot notation for keys (e.g., 'hero.title').
 * Supports [data-html="true"] for injecting raw HTML.
 * @param {object} translations 
 */
function applyTranslations(translations) {
    const elements = document.querySelectorAll('[data-i18n]');
    
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        const keys = key.split('.');
        let value = translations;
        
        // Deep traverse the JSON object
        for (const k of keys) {
            if (value === undefined) break;
            value = value[k];
        }

        if (value) {
            if (element.getAttribute('data-html') === 'true') {
                element.innerHTML = value;
            } else {
                element.innerText = value;
            }
        } else {
            console.warn(`Missing translation key: ${key}`);
        }
    });
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    const currentLang = getInitialLang();
    loadTranslations(currentLang);

    // Handle Language Switcher changes
    const selector = document.getElementById('language-selector');
    if (selector) {
        selector.addEventListener('change', (e) => {
            const newLang = e.target.value;
            
            // Persist choice
            localStorage.setItem(STORAGE_KEY, newLang);
            
            // Hiding body again for a smooth transition is optional, but
            // usually prefer immediate update for language switches.
            loadTranslations(newLang);
            
            // Update URL for sharability without page reload
            const url = new URL(window.location);
            url.searchParams.set('lang', newLang);
            window.history.pushState({}, '', url);
        });
    }
});
