# Pesa — Personal Budgeting

Mobile-first budgeting app: move your salary into pots, watch each one fill. Built with Next.js 16, React 19, Prisma + Neon (Postgres), and Auth.js v5.

## Stack

- Next.js 16 (App Router, Server Actions)
- React 19
- Prisma ORM + Neon (serverless Postgres)
- Auth.js v5 — Google OAuth, email magic link (Resend), email + password
- Tailwind v4 (mostly unused — design uses raw CSS in `app/globals.css`)

## Local development

Development runs against its **own local Postgres**, never the production database.

```bash
npm install
cp .env.example .env        # then fill in the AUTH_* values
npm run db:dev              # terminal 1: local Postgres 17 on :5433, applies migrations
npm run dev                 # terminal 2: http://localhost:3000
```

- `npm run db:dev` uses the `embedded-postgres` package, so you don't need Docker or a Postgres install. Data lives in `.devdb/` (gitignored). The first run downloads Postgres and initialises it, and every run applies new migrations.
- `npm run db:dev:reset` wipes the local data and starts fresh.
- Sign up in the app to get an account. New accounts are seeded with starter pots.
- `.env` sets `RATE_LIMITS_DISABLED=1` locally, so test runs aren't throttled. Production ignores it.
- The production Neon credentials are kept in `.env.neon.local` (gitignored) for reference only. Don't point `.env` at them.

Production deployment, environment variables and migrations: [docs/DEPLOY.md](docs/DEPLOY.md).

### Auth providers

- **Google OAuth**: create credentials at <https://console.cloud.google.com> → OAuth 2.0 Client ID. Authorized redirect: `${AUTH_URL}/api/auth/callback/google`.
- **Resend** (magic link): sign up at <https://resend.com>, copy an API key into `AUTH_RESEND_KEY`. Use `onboarding@resend.dev` as `AUTH_EMAIL_FROM` while testing.
- **Email + password**: no setup — handled in-app via `bcryptjs` against the `passwordHash` column.

## Scripts

```bash
npm run dev         # Next dev (Turbopack)
npm run build       # prisma migrate deploy && next build
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run db:dev      # local dev Postgres (keep running)
npm run db:migrate  # create a migration (prisma migrate dev, against the local DB)
npm run db:studio   # browse the DB in Prisma Studio
npm run smoke:mobile    # mobile API smoke test (BASE_URL overridable)
npm run check:release   # pre-release checks (see docs/DEPLOY.md)
```

## Docs

- [docs/DEPLOY.md](docs/DEPLOY.md): production on Vercel + Neon, env vars, migrations, rollback
- [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md): turning on phone push notifications
- [docs/store/](docs/store/): Google Play and App Store submission, listing copy, privacy forms
- [pesa_mobile/README.md](pesa_mobile/README.md): the Flutter app (run, test, release builds)

## Project layout

- `app/page.tsx` — server component: loads the signed-in user's pots/ledger/insights, then renders the device-framed client app.
- `app/sign-in`, `app/sign-up` — auth pages (styled like the rest of the app).
- `app/actions/*` — server actions for mutations (`disburse`, `createBucket`, `adjustTarget`, `updateProfile`, `resetMonth`, `registerUser`).
- `app/api/auth/[...nextauth]/route.ts` — Auth.js handler.
- `auth.ts`, `auth.config.ts`, `proxy.ts` — Auth.js configuration (split for Edge proxy safety; `proxy.ts` replaces Next 15's `middleware.ts`).
- `components/pesa/*` — UI: app shell, screens (home, disburse, bucket-detail, insights, wrap, more, add-pot), shared primitives.
- `lib/db.ts` — Prisma client singleton.
- `lib/auth-related helpers` — `lib/session.ts` (`requireUserId`), `lib/seed.ts` (new-user starter pots), `lib/insights.ts` (6-month flow derivation).
- `prisma/schema.prisma` — schema: Auth.js tables + `Bucket` + `Transaction`.
