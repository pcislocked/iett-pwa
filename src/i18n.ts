import i18n from 'i18next'
import Backend from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: ['tr', 'en'],
    fallbackLng: 'tr',
    // Load from public/locales/
    backend: {
      loadPath: '/locales/{{lng}}.json',
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'iett-pwa-lang',
    },
    interpolation: {
      escapeValue: false, // React escapes by default
    },
    debug: import.meta.env.DEV,
  })

export default i18n
