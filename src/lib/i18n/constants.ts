/**
 * Supported UI languages and i18n configuration constants.
 *
 * React-free so it can be imported by the i18n setup, UI components, and tests
 * alike without pulling in React.
 */
export interface Language {
  code: string
  label: string
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
]

export const DEFAULT_LANGUAGE = 'en'

/** localStorage key the language detector reads from / writes to. */
export const LANGUAGE_STORAGE_KEY = 'language'
