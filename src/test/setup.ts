import '@testing-library/jest-dom/vitest'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import tr from '../../public/locales/tr.json'

i18n
  .use(initReactI18next)
  .init({
    lng: 'tr',
    fallbackLng: 'tr',
    resources: {
      tr: { translation: tr }
    },
    interpolation: {
      escapeValue: false,
    },
    parseMissingKeyHandler: (key, defaultValue) => {
      return defaultValue || key
    }
  })

// We don't mock react-i18next anymore. We just let it use the real one configured above.
