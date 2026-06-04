import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { THEME_ROTATION_LAST_DATE_KEY, THEME_STORAGE_KEY } from './constants'
import {
  ROTATION_POOL,
  maybeRotateDailyTheme,
  pickRandomTheme,
  readRotationEnabled,
  storeRotationEnabled,
} from './dailyRotation'

afterEach(() => {
  localStorage.clear()
})

describe('readRotationEnabled / storeRotationEnabled', () => {
  it('defaults to false when nothing is stored', () => {
    expect(readRotationEnabled()).toBe(false)
  })

  it('round-trips the enabled flag', () => {
    storeRotationEnabled(true)
    expect(readRotationEnabled()).toBe(true)
    storeRotationEnabled(false)
    expect(readRotationEnabled()).toBe(false)
  })
})

describe('pickRandomTheme', () => {
  it('only ever returns pool members', () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(ROTATION_POOL).toContain(pickRandomTheme(undefined, () => r))
    }
  })

  it('never returns the excluded theme', () => {
    for (const r of [0, 0.34, 0.67, 0.999]) {
      expect(pickRandomTheme('pastel-pink', () => r)).not.toBe('pastel-pink')
    }
  })

  it('clamps a random value of 1 to the last candidate', () => {
    // random() === 1 would index out of bounds without clamping.
    expect(ROTATION_POOL).toContain(pickRandomTheme(undefined, () => 1))
  })
})

describe('maybeRotateDailyTheme', () => {
  beforeEach(() => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
  })

  it('is a no-op when rotation is disabled', () => {
    expect(maybeRotateDailyTheme('2026-06-04')).toBeNull()
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    expect(localStorage.getItem(THEME_ROTATION_LAST_DATE_KEY)).toBeNull()
  })

  it('is a no-op when it already rotated today', () => {
    storeRotationEnabled(true)
    localStorage.setItem(THEME_ROTATION_LAST_DATE_KEY, '2026-06-04')
    localStorage.setItem(THEME_STORAGE_KEY, 'pastel-violet')

    expect(maybeRotateDailyTheme('2026-06-04')).toBeNull()
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('pastel-violet')
  })

  it('rotates, persists the new theme, and stamps the date on a new day', () => {
    storeRotationEnabled(true)
    localStorage.setItem(THEME_ROTATION_LAST_DATE_KEY, '2026-06-03')
    localStorage.setItem(THEME_STORAGE_KEY, 'pastel-pink')

    const next = maybeRotateDailyTheme('2026-06-04')

    expect(next).not.toBeNull()
    expect(ROTATION_POOL).toContain(next)
    expect(next).not.toBe('pastel-pink') // excludes the current theme
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(next)
    expect(localStorage.getItem(THEME_ROTATION_LAST_DATE_KEY)).toBe('2026-06-04')
  })
})
