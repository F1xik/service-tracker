import {
  DEFAULT_THEME,
  THEME_CLASS,
  THEME_STORAGE_KEY,
  THEMES,
  type ThemeId,
} from './constants'

const KNOWN_IDS = new Set<ThemeId>(THEMES.map((theme) => theme.id))

function isThemeId(value: string | null): value is ThemeId {
  return value !== null && KNOWN_IDS.has(value as ThemeId)
}

/**
 * Applies a theme by toggling the matching class on the document root. Clears
 * every other theme class first so switching never stacks palettes.
 */
export function applyTheme(id: ThemeId): void {
  const root = document.documentElement
  for (const className of Object.values(THEME_CLASS)) {
    if (className) root.classList.remove(className)
  }
  const target = THEME_CLASS[id]
  if (target) root.classList.add(target)
}

/**
 * Reads the persisted theme from localStorage, falling back to the default for
 * a missing, invalid, or unreadable value.
 */
export function readStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeId(stored) ? stored : DEFAULT_THEME
  } catch {
    // localStorage can throw (privacy mode, disabled storage). Treat as default.
    return DEFAULT_THEME
  }
}

/** Persists the chosen theme, ignoring storage failures. */
export function storeTheme(id: ThemeId): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id)
  } catch {
    // Non-fatal: the choice just won't survive a reload.
  }
}
