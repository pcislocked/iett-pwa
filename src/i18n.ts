import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import tr from '../public/locales/tr.json'
import en from '../public/locales/en.json'
import ku from '../public/locales/ku.json'

if (!i18n.isInitialized) {
  void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        tr: { translation: tr },
        en: { translation: en },
        ku: { translation: ku },
      },
      supportedLngs: ['tr', 'en', 'ku'],
      fallbackLng: 'tr',
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
        lookupLocalStorage: 'iett-pwa-lang',
      },
      interpolation: {
        escapeValue: false, // React escapes by default
      },
      debug: Boolean(import.meta.env.DEV && !(typeof process !== 'undefined' && process.env?.VITEST)),
    })
}

i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng
  }
})

export default i18n
