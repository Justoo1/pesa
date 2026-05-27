# Pesa — Personal Budgeting

Mobile-first budgeting app: move your salary into pots, watch each one fill. Built with Next.js 16, React 19, Prisma + Neon (Postgres), and Auth.js v5.

## Stack

- Next.js 16 (App Router, Server Actions)
- React 19
- Prisma ORM + Neon (serverless Postgres)
- Auth.js v5 — Google OAuth, email magic link (Resend), email + password
- Tailwind v4 (mostly unused — design uses raw CSS in `app/globals.css`)

## Setup

```bash
npm install
cp .env.example .env.local
# fill in DATABASE_URL / DIRECT_URL / AUTH_* values
npx prisma migrate dev --name init
npm run dev
```

### Database (Neon via Vercel)

1. In the Vercel dashboard for the project: **Storage → Create Database → Neon**.
2. Vercel auto-injects `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) into the project's env.
3. Locally, run `vercel env pull .env.local` to mirror them.

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
npm run db:migrate  # prisma migrate dev
npm run db:studio   # browse the DB in Prisma Studio
```

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
