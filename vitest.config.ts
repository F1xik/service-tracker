import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Kept separate from vite.config.ts: tests don't need the PWA/Tailwind build
// plugins. We do include the React plugin so component tests get the automatic
// JSX runtime (tsconfig uses `jsx: react-jsx`, which esbuild alone won't honour
// without `React` in scope).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // jsdom gives component tests a DOM. Pure modules (calc, supabase) run fine
    // under it too, so a single environment keeps config simple.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
