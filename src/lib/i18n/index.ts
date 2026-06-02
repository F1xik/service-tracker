import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
} from './constants'
import en from './locales/en.json'
import ru from './locales/ru.json'

// Single i18next instance for the whole app. Importing this module for its
// side effect (see `src/main.tsx`) initializes translations before render.
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
    },
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    // Resolve region variants (e.g. "en-US") down to the base language.
    load: 'languageOnly',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: {
      // React already escapes values, so i18next must not double-escape.
      escapeValue: false,
    },
    react: {
      // No Suspense boundary wraps the app; resources are bundled and load
      // synchronously, so this avoids a needless Suspense requirement.
      useSuspense: false,
    },
  })

export default i18n
