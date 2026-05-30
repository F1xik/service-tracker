# Task 03 — Auth (Sign Up / Sign In / Session)

## Goal

Email/password authentication via Supabase Auth, with a session context available app-wide and protected routes that redirect unauthenticated users to sign-in.

## Files

- `src/features/auth/AuthContext.tsx` — React context that holds the Supabase `Session` and exposes `signIn`, `signUp`, `signOut`.
- `src/features/auth/useAuth.ts` — convenience hook that consumes `AuthContext`.
- `src/features/auth/SignInPage.tsx` — sign-in form (email + password).
- `src/features/auth/SignUpPage.tsx` — sign-up form (email + password + optional display name).
- `src/routes/ProtectedRoute.tsx` — wrapper that redirects to `/sign-in` when there is no session.

## Behaviour

- On mount, `AuthContext` calls `supabase.auth.getSession()` and subscribes to `onAuthStateChange`.
- `signUp` calls `supabase.auth.signUp`; on success the trigger (Task 02) creates the `profiles` row.
- After sign-in, redirect to `/` (the log-income page).
- After sign-out, redirect to `/sign-in`.
- Protected routes (`/`, `/services`, `/stats`, `/import`) are wrapped with `<ProtectedRoute>`.

## Forms

Both forms use `react-hook-form` + `zod`:
- Email: valid email format required.
- Password: min 8 characters.

## Acceptance Criteria

- Signing up with a new email creates an entry in `auth.users` and a matching row in `profiles`.
- Signing in with correct credentials lands on the home page; wrong credentials show an inline error.
- Refreshing the page while signed in stays on the current protected route (session persisted).
- Navigating to a protected route while signed out redirects to `/sign-in`.
