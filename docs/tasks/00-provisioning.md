# Task 00 — Provision Supabase & Vercel (manual, do this first)

## Goal

A one-time, manual setup that **you (the account owner) must do** before development can
proceed. By the end you will have a free-tier Supabase project with the database schema
applied, a Vercel account ready for deployment, and the two environment values the app needs
recorded safely. Tasks 02 (schema), 03 (auth), and 08 (deploy) all depend on this being done.

> This task is mostly point-and-click in the Supabase and Vercel web dashboards — no command
> line required.

---

## A. Supabase account & project

1. Go to [supabase.com](https://supabase.com) and **Sign up** (using your GitHub account is the
   quickest option). The Free plan is all this project needs.
2. Click **New project**:
   - **Name**: e.g. `service-tracker`.
   - **Database password**: generate a strong one and **save it in a password manager** — you
     will not be shown it again, and you need it for direct DB access.
   - **Region**: pick the one geographically nearest to you / your users.
   - **Plan**: Free.
3. Wait ~2 minutes for the project to finish provisioning.
4. **Copy the two keys the app needs.** Go to **Project Settings → API**:
   - **Project URL** → this is your `VITE_SUPABASE_URL`.
   - **Project API Keys → `anon` / `public`** → this is your `VITE_SUPABASE_ANON_KEY`.
   - ⚠️ The `anon` key is designed to be used in the browser and is safe to expose. **Do NOT**
     use the `service_role` key anywhere in the frontend or in `VITE_*` env vars — it bypasses
     Row Level Security and must stay secret.
5. **Apply the database schema** (this fulfils the manual half of Task 02):
   - In the dashboard, open **SQL Editor → New query**.
   - Paste the entire contents of [`supabase/migrations/0001_initial_schema.sql`](../../supabase/migrations/0001_initial_schema.sql).
   - Click **Run**.
   - Verify in **Table Editor** that three tables now exist: `profiles`, `services`,
     `income_entries`, and that each shows **RLS enabled**.
6. **Configure Auth** (supports Task 03):
   - **Authentication → Providers**: confirm **Email** is enabled.
   - For easier local testing you may turn **"Confirm email"** off (Authentication → Providers →
     Email). You can re-enable it later for production.
   - **Authentication → URL Configuration**: add `http://localhost:5173` to the **Site URL** /
     **Redirect URLs** so local sign-in works. Add your Vercel URL here too once you have it
     (Section B / Task 08).

---

## B. Vercel account (for deployment — can be done now or just before Task 08)

1. Go to [vercel.com](https://vercel.com) and **Sign up** (use the **Hobby / Free** plan; signing
   in with GitHub makes the later repo import one click).
2. Make sure your GitHub account is connected to Vercel.
3. That's all for now — the actual repo import, env-var entry, and deploy happen in **Task 08**.
   At that point you'll add the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values in
   the Vercel project's **Settings → Environment Variables**.

---

## C. Record the env values for local development

You now have the two values from Section A.4. They feed the local `.env` file (created in
Task 01):

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
```

- Until Task 01 scaffolds `.env.example`, just keep these two values in your password manager.
- After Task 01: `cp .env.example .env` and paste the values in. `.env` is gitignored — **never
  commit it**.

---

## D. Handoff so development can continue

Development continues in a fresh cloud environment that does **not** have your keys. To unblock
the next steps, make the two values available one of these ways:

- Paste the **Project URL** and **anon key** into the next working session when asked, **or**
- Store them as environment variables / secrets in your Claude Code on the web **environment
  settings** so they're present automatically.

Only the **Project URL + anon key** are needed to continue — both are public-safe. Your
**database password** and **`service_role` key** stay private and should never be shared or
committed.

---

## Acceptance Criteria

- A Supabase Free-tier project exists and has finished provisioning.
- `0001_initial_schema.sql` has been run; `profiles`, `services`, and `income_entries` exist with
  RLS enabled.
- Email auth is enabled and `http://localhost:5173` is in the allowed redirect URLs.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are recorded safely (and ready to drop into
  `.env`).
- A Vercel Free account exists with GitHub connected.
- No secret keys (`service_role`, DB password) are committed anywhere.
