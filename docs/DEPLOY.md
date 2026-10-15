# Deploying Pesa to production

Production: **https://pesa.edtmsys.com**, hosted on **Vercel**, with the database on **Neon** Postgres. The mobile apps call the same server at `https://pesa.edtmsys.com/api/mobile/*`.

Development never touches production: `npm run db:dev` runs a local Postgres. See [README.md](../README.md#local-development).

---

## 1. One-time setup

### Vercel project
1. <https://vercel.com/new> → import the GitHub repo `Justoo1/pesa`. Framework: Next.js (auto-detected).
2. You don't need to override the build command. `npm run build` runs `prisma migrate deploy && next build`, so every deploy applies pending migrations before the new code goes live.

### Database (Neon)
- In Vercel → **Storage** → **Connect Database** → **Neon**, use the existing Pesa database. This injects `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct; Prisma migrations use it).
- The original Neon connection strings from your old `.env` are saved in the gitignored `.env.neon.local`.
- Migrations up to and including `20261014155427_password_unverified` are already applied on that database.

### Domain
1. Vercel → Project → **Settings → Domains** → add `pesa.edtmsys.com`.
2. At your DNS provider for `edtmsys.com`, add the record Vercel shows. Normally that's a **CNAME** `pesa` → `cname.vercel-dns.com`.
3. Wait for Vercel to show a valid certificate.

### Environment variables (Production)
Vercel → **Settings → Environment Variables**, scoped to **Production**:

| Variable | Value / how to get it |
|---|---|
| `AUTH_URL` | `https://pesa.edtmsys.com` — required: every emailed link is built from it |
| `AUTH_SECRET` | `npx auth secret` (≥32 chars) |
| `MOBILE_JWT_SECRET` | `openssl rand -hex 32` — **different** from `AUTH_SECRET` |
| `CRON_SECRET` | any long random string; Vercel Cron sends it automatically |
| `AUTH_RESEND_KEY` | Resend API key |
| `AUTH_EMAIL_FROM` | `Pesa <no-reply@edtmsys.com>`, a sender on a domain verified in Resend (SPF + DKIM records added at your DNS) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google Cloud OAuth client. Add the redirect URI `https://pesa.edtmsys.com/api/auth/callback/google` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys`. **Reuse your current keys**: new keys break every existing browser subscription |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | same value as `VAPID_PUBLIC_KEY` |
| `VAPID_SUBJECT` | `mailto:amankrahjay@gmail.com` |
| `FCM_SERVICE_ACCOUNT` | optional, turns phone push on. See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) |

Don't set `RATE_LIMITS_DISABLED` in production. The server ignores it there anyway.

Keep the existing values for `AUTH_SECRET` and `MOBILE_JWT_SECRET` if you have them. Changing `AUTH_SECRET` signs everyone out of the web app, and changing `MOBILE_JWT_SECRET` makes every phone sign in again.

### Crons
`vercel.json` schedules three routes, all at 09:00 UTC, which is 09:00 in Ghana:
- `payday-reminder`, daily;
- `bills-due-reminder`, daily;
- `monthly-wrap`, on the 1st of the month.

They fit the Hobby plan's once-a-day limit. Vercel calls each one with `Authorization: Bearer $CRON_SECRET`, and requests without it are refused.

## 2. Every deploy

1. Push to `master`. CI (`.github/workflows/ci.yml`) runs typecheck, lint, build, the API smoke test and the Flutter checks. Vercel builds and deploys automatically.
2. After it's live, run:
   ```bash
   vercel env pull .env.production.local --environment=production
   npm run check:release -- --env .env.production.local --url https://pesa.edtmsys.com
   ```
   This checks every secret is present and well-formed, the legal pages are public, and the mobile API answers. `.env.production.local` is gitignored; delete it afterwards if you like.
3. **Schema changes:**
   - Create migrations locally with `npm run db:migrate`. That runs against your local dev database.
   - Commit the new folder under `prisma/migrations/`.
   - The next deploy applies it to Neon.
   - Never run `prisma migrate dev` or `db push` against production.

## 3. One-time cleanup after this release

The rate limiter now stores only hashed keys. Rows written before this release still hold email addresses and IPs in plain text. Those rows are just short-lived counters, so it's safe to clear them once after deploying. In the Neon SQL editor:

```sql
DELETE FROM "RateLimit";
```

## 4. Mobile release builds

Both apps must be built against production, and release builds refuse to start with a non-https API:

```bash
cd pesa_mobile
flutter build appbundle --release --dart-define=API_BASE_URL=https://pesa.edtmsys.com   # Google Play
flutter build ipa       --release --dart-define=API_BASE_URL=https://pesa.edtmsys.com   # App Store (Mac)
```

Bump `version:` in `pubspec.yaml` before every store upload. The `+N` build number must always go up.

Store submission: [store/PLAY_STORE.md](store/PLAY_STORE.md), [store/APP_STORE.md](store/APP_STORE.md).

## 5. Rollback

- **Code:** Vercel → Deployments → pick the last good one → **Promote to Production**.
- **Database:** migrations only move forward. To undo a schema change, write a new migration. Neon's point-in-time restore (Branches → Restore) is the last resort for data loss.
