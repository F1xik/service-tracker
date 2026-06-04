import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/App'
import '@/lib/i18n'
import '@/index.css'
import { applyTheme, readStoredTheme } from '@/lib/theme'
import { maybeRotateDailyTheme } from '@/lib/theme/dailyRotation'

// Rotate to a new pastel theme on the first open of the day (when enabled). It
// persists the new choice, so `readStoredTheme()` below already reflects it.
maybeRotateDailyTheme()

// Apply the saved theme before first paint to avoid a flash of the default.
applyTheme(readStoredTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
