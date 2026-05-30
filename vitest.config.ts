import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'

// Kept separate from vite.config.ts: tests don't need the PWA/React build
// plugins, only the `@` alias so they can resolve app modules.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
