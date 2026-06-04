import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { applyTheme, readStoredTheme, storeTheme } from './index'
import { DEFAULT_THEME, THEME_STORAGE_KEY } from './constants'

describe('readStoredTheme', () => {
  beforeEach(() => localStorage.clear())

  it('returns the default when nothing is stored', () => {
    expect(readStoredTheme()).toBe(DEFAULT_THEME)
  })

  it('returns the default for an unknown value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'neon-green')
    expect(readStoredTheme()).toBe(DEFAULT_THEME)
  })

  it('returns the stored value when it is a known theme', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'pastel-violet')
    expect(readStoredTheme()).toBe('pastel-violet')
  })
})

describe('storeTheme', () => {
  beforeEach(() => localStorage.clear())

  it('persists the chosen theme', () => {
    storeTheme('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })
})

describe('applyTheme', () => {
  afterEach(() => {
    document.documentElement.className = ''
  })

  it('adds the matching class for a non-default theme', () => {
    applyTheme('pastel-pink')
    expect(document.documentElement.classList.contains('theme-pastel-pink')).toBe(true)
  })

  it('adds no theme class for the light (default) theme', () => {
    applyTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.classList.contains('theme-pastel-pink')).toBe(false)
  })

  it('clears a previously applied theme class when switching', () => {
    applyTheme('dark')
    applyTheme('pastel-tiffany')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.classList.contains('theme-pastel-tiffany')).toBe(
      true,
    )
  })
})
