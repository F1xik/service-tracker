import { createContext, useCallback, useLayoutEffect, useState } from 'react'

import { type ThemeId } from '@/lib/theme/constants'
import { applyTheme, readStoredTheme, storeTheme } from '@/lib/theme'

interface ThemeContextValue {
  theme: ThemeId
  setTheme: (id: ThemeId) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize from storage so the first render already reflects the choice.
  const [theme, setThemeState] = useState<ThemeId>(() => readStoredTheme())

  // Keep the document root class in sync with state (handles SSR-free mount too).
  useLayoutEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((id: ThemeId) => {
    storeTheme(id)
    setThemeState(id)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
