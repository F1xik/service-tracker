import '@testing-library/jest-dom/vitest'
// Initialize i18n so `t()` returns real (English) strings under jsdom rather
// than raw keys, keeping existing string assertions valid.
import '@/lib/i18n'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// React Testing Library doesn't auto-clean between tests when `globals: true`
// is used without its own setup, so unmount and reset the DOM after each test.
afterEach(() => {
  cleanup()
})
