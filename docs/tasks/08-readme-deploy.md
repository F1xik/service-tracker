# Task 08 — README & Deploy Docs

## Goal

Write a `README.md` at the repo root that covers everything needed to run the project locally and deploy it to Vercel + Supabase from scratch.

## Sections

### Prerequisites
- Node 20+
- A free [Supabase](https://supabase.com) account
- A free [Vercel](https://vercel.com) account (for deployment)

### Local Setup
1. Clone the repo.
2. `npm install`
3. Create a Supabase project; copy the project URL and anon key.
4. `cp .env.example .env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Apply the database schema: run `supabase/migrations/0001_initial_schema.sql` in the Supabase SQL editor (or via Supabase CLI: `supabase db push`).
6. `npm run dev` — open [http://localhost:5173](http://localhost:5173).

### Running Tests
```
npm test
```

### Building for Production
```
npm run build
npm run preview   # local preview of the production build
```

### Deploy to Vercel
1. Push the repo to GitHub.
2. Import the repo in Vercel.
3. Set the two environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in the Vercel project settings.
4. Deploy. Vercel auto-detects Vite; no custom build config needed.

### Installing as a PWA
On iPhone (Safari): tap the Share button → "Add to Home Screen."
On Android (Chrome): tap the install prompt or browser menu → "Install app."

### Future: Wrapping as a Native iOS/Android App
The codebase is structured for a Capacitor wrap with no app code changes:
1. `npm install @capacitor/core @capacitor/cli @capacitor/ios`
2. `npx cap init && npx cap add ios`
3. `npm run build && npx cap sync`
4. Open in Xcode, build, submit to App Store (requires Apple Developer account, $99/yr).

## Acceptance Criteria

- A developer who has never seen the project can follow the README to get it running locally in under 10 minutes.
- All env var names match what the code actually reads.
- The deploy steps result in a working Vercel deployment.
