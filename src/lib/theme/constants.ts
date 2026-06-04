/**
 * Supported color themes and theme configuration constants.
 *
 * React-free so it can be imported by the theme setup, UI components, and tests
 * alike without pulling in React.
 */
export type ThemeId =
  | 'light'
  | 'dark'
  | 'pastel-pink'
  | 'pastel-tiffany'
  | 'pastel-violet'
  | 'pastel-yellow'

export interface Theme {
  id: ThemeId
  /** i18n key for the human-readable theme name. */
  labelKey: string
  /** Class providing the swatch preview gradient (defined in `index.css`). */
  swatchClass: string
}

export const THEMES: Theme[] = [
  { id: 'light', labelKey: 'settings.themes.light', swatchClass: 'swatch-light' },
  { id: 'dark', labelKey: 'settings.themes.dark', swatchClass: 'swatch-dark' },
  {
    id: 'pastel-pink',
    labelKey: 'settings.themes.pastelPink',
    swatchClass: 'swatch-pastel-pink',
  },
  {
    id: 'pastel-tiffany',
    labelKey: 'settings.themes.pastelTiffany',
    swatchClass: 'swatch-pastel-tiffany',
  },
  {
    id: 'pastel-violet',
    labelKey: 'settings.themes.pastelViolet',
    swatchClass: 'swatch-pastel-violet',
  },
  {
    id: 'pastel-yellow',
    labelKey: 'settings.themes.pastelYellow',
    swatchClass: 'swatch-pastel-yellow',
  },
]

export const DEFAULT_THEME: ThemeId = 'light'

/** localStorage key the theme preference reads from / writes to. */
export const THEME_STORAGE_KEY = 'theme'

/** localStorage key for the daily random-theme rotation on/off preference. */
export const THEME_ROTATION_ENABLED_KEY = 'theme-rotation-enabled'

/** localStorage key for the `YYYY-MM-DD` date the theme last auto-rotated. */
export const THEME_ROTATION_LAST_DATE_KEY = 'theme-rotation-last-date'

/**
 * Maps a theme id to the class applied on the document root. Light is the
 * default palette (defined at `:root` in `index.css`), so it needs no class.
 */
export const THEME_CLASS: Record<ThemeId, string> = {
  light: '',
  dark: 'dark',
  'pastel-pink': 'theme-pastel-pink',
  'pastel-tiffany': 'theme-pastel-tiffany',
  'pastel-violet': 'theme-pastel-violet',
  'pastel-yellow': 'theme-pastel-yellow',
}
