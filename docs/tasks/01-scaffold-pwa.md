# Task 01 — Project Scaffold & PWA Config

## Goal

Bootstrap the Vite + React + TypeScript project with all dependencies installed and a working PWA configuration (installable, offline-capable).

## Steps

1. Run `npm create vite@latest . -- --template react-ts` in the repo root.
2. Install dependencies:
   ```
   npm install react-router-dom @supabase/supabase-js @tanstack/react-query
   npm install react-hook-form zod @hookform/resolvers
   npm install recharts
   npm install -D tailwindcss @tailwindcss/vite vite-plugin-pwa
   ```
3. Configure Tailwind: add the `@tailwindcss/vite` plugin to `vite.config.ts` and `@import "tailwindcss"` to `src/index.css`.
4. Configure `vite-plugin-pwa` in `vite.config.ts`:
   - `manifest`: app name, short name, `display: "standalone"`, `theme_color`, `background_color`, icons (at minimum 192×192 and 512×512 PNG placeholders).
   - `workbox`: `clientsClaim: true`, `skipWaiting: true`.
5. Add `.env.example` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
6. Create `src/lib/supabase.ts` — initialise and export the Supabase client from env vars.
7. Create `src/lib/calc.ts` — empty module with exported types `Service`, `IncomeEntry`; placeholder `computeEarnings(price, pct)` function.
8. Set up folder skeleton: `src/features/{auth,services,income,stats,import}/`, `src/components/ui/`, `src/routes/`.
9. Replace the Vite default `App.tsx` with a minimal shell that imports `QueryClientProvider` and a `<RouterProvider>`.

## Acceptance Criteria

- `npm run dev` starts without errors.
- `npm run build && npm run preview` — Lighthouse/browser DevTools shows the app is installable (manifest + service worker detected).
- Tailwind utility classes render correctly in the browser.
- `.env.example` is committed; `.env` is in `.gitignore`.
