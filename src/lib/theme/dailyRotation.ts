/**
 * Daily random theme rotation.
 *
 * When enabled, the app switches to a randomly-chosen pastel theme on the first
 * open of each day. All storage and selection logic lives here, React-free, so
 * it stays unit-testable in isolation like the rest of `src/lib/theme`.
 */
import { todayLocal } from '@/lib/date'

import {
  THEME_ROTATION_ENABLED_KEY,
  THEME_ROTATION_LAST_DATE_KEY,
  type ThemeId,
} from './constants'
import { readStoredTheme, storeTheme } from './index'

/**
 * Themes the daily rotation picks from — pastels only, so an automatic switch
 * never jumps to Light or Dark.
 */
export const ROTATION_POOL: ThemeId[] = [
  'pastel-pink',
  'pastel-tiffany',
  'pastel-violet',
  'pastel-yellow',
]

/** Reads the rotation on/off preference, defaulting to off (opt-in). */
export function readRotationEnabled(): boolean {
  try {
    return localStorage.getItem(THEME_ROTATION_ENABLED_KEY) === 'true'
  } catch {
    // localStorage can throw (privacy mode, disabled storage). Treat as off.
    return false
  }
}

/** Persists the rotation preference, ignoring storage failures. */
export function storeRotationEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(THEME_ROTATION_ENABLED_KEY, enabled ? 'true' : 'false')
  } catch {
    // Non-fatal: the choice just won't survive a reload.
  }
}

/** Stamps the date the theme last auto-rotated, ignoring storage failures. */
export function storeRotationDate(date: string): void {
  try {
    localStorage.setItem(THEME_ROTATION_LAST_DATE_KEY, date)
  } catch {
    // Non-fatal.
  }
}

function readRotationDate(): string | null {
  try {
    return localStorage.getItem(THEME_ROTATION_LAST_DATE_KEY)
  } catch {
    return null
  }
}

/**
 * Picks a pool theme uniformly at random, never returning `exclude` so the
 * theme visibly changes. `random` is injectable for deterministic tests.
 */
export function pickRandomTheme(
  exclude?: ThemeId,
  random: () => number = Math.random,
): ThemeId {
  const candidates = ROTATION_POOL.filter((id) => id !== exclude)
  // If `exclude` is somehow the whole pool, fall back to the full pool.
  const pool = candidates.length > 0 ? candidates : ROTATION_POOL
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length))
  return pool[index]
}

/**
 * Rotates the theme once per day when the feature is enabled. Returns the new
 * theme id if it rotated, or `null` for a no-op (disabled, or already rotated
 * today). On rotation it persists both the new theme and today's date so a
 * subsequent `readStoredTheme()` reflects the change.
 */
export function maybeRotateDailyTheme(today: string = todayLocal()): ThemeId | null {
  if (!readRotationEnabled()) return null
  if (readRotationDate() === today) return null

  const next = pickRandomTheme(readStoredTheme())
  storeTheme(next)
  storeRotationDate(today)
  return next
}
