import { createContext, useCallback, useLayoutEffect, useState } from 'react'

import { type ThemeId } from '@/lib/theme/constants'
import { applyTheme, readStoredTheme, storeTheme } from '@/lib/theme'
import {
  readRotationEnabled,
  storeRotationDate,
  storeRotationEnabled,
} from '@/lib/theme/dailyRotation'
import { todayLocal } from '@/lib/date'

interface ThemeContextValue {
  theme: ThemeId
  setTheme: (id: ThemeId) => void
  /** Whether the theme auto-rotates to a new pastel on the first open each day. */
  dailyRotation: boolean
  setDailyRotation: (enabled: boolean) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize from storage so the first render already reflects the choice.
  const [theme, setThemeState] = useState<ThemeId>(() => readStoredTheme())
  const [dailyRotation, setDailyRotationState] = useState<boolean>(() =>
    readRotationEnabled(),
  )

  // Keep the document root class in sync with state (handles SSR-free mount too).
  useLayoutEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((id: ThemeId) => {
    storeTheme(id)
    setThemeState(id)
  }, [])

  const setDailyRotation = useCallback((enabled: boolean) => {
    storeRotationEnabled(enabled)
    // Stamp today on enable so the first auto-rotation lands tomorrow rather
    // than on the next reload — the user just picked a theme by toggling.
    if (enabled) storeRotationDate(todayLocal())
    setDailyRotationState(enabled)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, dailyRotation, setDailyRotation }}>
      {children}
    </ThemeContext.Provider>
  )
}
