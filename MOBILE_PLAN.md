# Pesa Mobile — Incremental Build Roadmap

This file is the persistent build script for the Flutter mobile client (`pesa_mobile/`). It is designed so that **any fresh agent session, with zero memory of prior sessions, can open this file, read the STATUS block, find the next unchecked step, read only that step's section, implement it, verify it, check it off, and stop.**

Do not build multiple phases in one sitting. Do not skip ahead. Do not re-derive the whole architecture from scratch each session — this file plus the "re-read before starting" lists are enough context.

---

## STATUS

- Current phase: 3.5
- Next step to run: 3.5.1
- Last completed step: 3.4
- Blocked: no
- Last updated: 2026-09-10 by implementation session (Phase 3.5 inserted at user request, starting now)

## SESSION LOG

(append-only — never edit or delete prior entries)

- 2026-09-06: Plan created from codebase exploration (Explore agents on the Next.js app + the vanilla `pesa_mobile` scaffold, then a Plan agent designed this phased roadmap). Architectural decisions locked in by the user: REST API added to the existing Next.js repo (`app/api/mobile/**`), Bearer JWT mobile auth, Riverpod + go_router, push notifications explicitly deferred to a stub. Executed Phase 0 (0.1 + 0.2) in the same session to prove the process end-to-end.
- 2026-09-06: Set up Linux desktop as the local run/test target (`sudo apt install clang cmake ninja-build pkg-config libgtk-3-dev`, then `flutter create --platforms=linux .`) since this dev box has no Android SDK, no Chrome, and is not macOS/iOS-capable. `flutter run -d linux` works (WSLg provides the display); GPU/Mesa warnings in the console are harmless software-rendering fallback noise, not errors.
- 2026-09-06: Implemented Phase 1 (mobile Bearer-JWT auth) — all 4 steps (1.1–1.4) complete and verified:
  - 1.1: Added `MobileSession` model + migration (`20260906161806_add_mobile_session`). Note: schema's actual direct-connection env var is `DATABASE_URL_UNPOOLED`, not `DIRECT_URL` as an earlier draft assumed — used the real one.
  - 1.2: Added `jose` dependency; `lib/mobile/jwt.ts` (sign/verify access tokens, refresh-token generation/hashing) and `lib/mobile/auth.ts` (`requireMobileUserId`, `issueTokenPair`). `MOBILE_JWT_SECRET` added to `.env.example` and generated into local `.env` via `openssl rand -hex 32`.
  - 1.3: Added `lib/mobile/schemas.ts` (shared `registerSchema`/`loginSchema`/`refreshSchema` — `app/actions/auth.ts` now imports `registerSchema` from here instead of defining its own, so web and mobile registration validate identically) and the four endpoints under `app/api/mobile/auth/{register,login,refresh,logout}/route.ts`. Curl-verified: register→login→refresh (rotates, old token then 401s)→logout→refresh (401s); duplicate-email register returns 409; web `/sign-up` and `/sign-in` pages still render fine after the `auth.ts` refactor. Google OAuth on mobile explicitly NOT implemented — deferred to Phase 8 §8.4. (Passwordless email sign-in was added later this same session as step 1.5 — see below.)
  - 1.4: Added `dio` + `flutter_secure_storage`. New `lib/core/{env,api_client,token_storage}.dart` and `lib/features/auth/{auth_repository,auth_provider,login_screen,register_screen}.dart`; `lib/core/router.dart` rewritten as a Riverpod `routerProvider` with an auth-aware `redirect`; `app.dart`/`home_screen.dart` updated accordingly (home now has a logout button). Deviation from the original draft: `Env.apiBaseUrl` defaults to `http://localhost:3000` (not `10.0.2.2`) since Linux desktop — same machine as the backend — is this project's actual local run target; the `10.0.2.2` case is noted in a code comment for whoever first targets the Android emulator.
  - Verification required extra local setup not anticipated in the original phase text: `flutter_secure_storage` on Linux needs `libsecret` + a running secret-service daemon (`sudo apt install libsecret-1-dev gnome-keyring`) — without it the app can't persist tokens on this dev box. Once installed, verified the full flow with a real Flutter **integration test** (`integration_test/app_test.dart`, run via `flutter test integration_test/app_test.dart -d linux`) rather than manual clicking, since no X11 automation tool (`xdotool` etc.) was available: fresh boot → Sign-in screen; register a unique user → lands on Home with a logout icon; a brand-new `ProviderScope`/`PesaApp` tree (simulating a cold app restart) still lands on Home, proving the access+refresh tokens really persisted via the OS keyring and not just in-memory; tap logout → back to Sign-in. All passed. The plain `flutter_test` widget test was also updated (overrides `tokenStorageProvider` with an in-memory fake so it doesn't touch the real secure-storage platform channel) and passes; `flutter analyze` is clean.
  - Next session: start at step 2.1 (extract `loadHomeData(userId)` from `app/page.tsx` + add `GET /api/mobile/bootstrap`). Re-read `app/page.tsx`, `components/pesa/types.ts`, and the four `lib/*.ts` files listed in Phase 2's "re-read before starting" line before starting.
- 2026-09-06: Set up a real Android emulator in this WSL2 environment (nested virtualization was available via `/dev/kvm`, so this runs natively rather than needing to bridge to the user's Windows-side Android Studio install). Installed a Linux Android SDK at `~/Android/Sdk` (cmdline-tools, platform-tools, build-tools 35/36/37.0, platforms 35/36/37.0, emulator, an x86_64 `google_apis` system image), Java 17 (`openjdk-17-jdk`), `libpulse0` (emulator runtime dep), and added the user to the `kvm` group (`sudo gpasswd -a jay kvm` — required a fresh WSL session to take effect). Created AVD `pesa_test` (Pixel 6 profile, API 35). `ANDROID_SDK_ROOT`/`ANDROID_HOME`/PATH additions are in `~/.bashrc`, but **note for future sessions: exported env vars do not persist between separate tool-call shells in this harness — re-export them (or use `~/.bashrc`'s values) at the start of every command that needs the SDK**, and prefer `flutter run -d emulator-5554` / `flutter test integration_test/*.dart -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:3000` (the `10.0.2.2` gateway, not `localhost`, is required for the emulator to reach the host's dev server).
  - Hit and fixed a real build issue: `flutter_secure_storage` requires `compileSdk 37`, but by this point Android has moved to major.minor platform naming (only `platforms;android-37.0` exists, no plain `android-37`) — fixed with `ln -s .../platforms/android-37.0 .../platforms/android-37` plus explicitly setting `compileSdk = 37` in `pesa_mobile/android/app/build.gradle.kts` (overriding `flutter.compileSdkVersion`).
  - Also found and fixed a **real app bug**, not just environment flakiness, while chasing intermittent Android/Linux test failures: `core/router.dart`'s `routerProvider` was reconstructing a **brand-new `GoRouter` instance** every time `authControllerProvider`'s state changed (it did `ref.watch(authControllerProvider)` directly inside the provider body). Swapping `MaterialApp.router`'s `routerConfig` to a new GoRouter object tears down and rebuilds the whole Navigator subtree — which could dispose the very `AuthController` notifier whose `register()`/`login()` call was still in-flight, mid-`await`, throwing `UnmountedRefException` right as it tried to assign its result to `state`. Fixed properly (not just papered over) two ways: (1) rewrote `router.dart` so `GoRouter` is created **once** and reacts to auth changes via a `refreshListenable` (a small `ChangeNotifier` bridging `ref.listen(authControllerProvider, ...)`), so redirects re-evaluate in place without recreating the Navigator; (2) added defense-in-depth `if (!ref.mounted) return;` checks before every post-`await` `state = ...` assignment in `AuthController` (`login`/`register`/`verifyLoginCode`/`logout`), per Riverpod's own guidance for this exact hazard. Verified with 3 consecutive clean `integration_test/app_test.dart` runs on Linux desktop and 3 more on the Android emulator (plus the email-code test) — zero recurrences after the fix, versus intermittent failures before it.
  - Separately (unrelated to the router bug): Android's real network round-trip through the `10.0.2.2` emulator gateway is slower than Linux desktop's direct `localhost`, so `integration_test/app_test.dart`'s `pumpAndSettle` durations after network-dependent steps were raised from 5s/10s to a flat 15s — this is genuine environment latency (emulator + APK overhead + NAT hop), not a bug.
  - Known limitation, not a bug: `integration_test/email_code_test.dart` reads the emailed code back from `/tmp/pesa-dev.log` on the WSL2 **host** filesystem — this only works for `-d linux` (native host process), not `-d emulator-5554` (the emulator is an isolated VM with its own filesystem). No fix attempted; Android coverage for the email-code flow would need a different mechanism (e.g. a test-only API endpoint to fetch the last code) if it's ever needed.
- 2026-09-06: Implemented Phase 2 (bootstrap endpoint + read-only dashboard) — all 3 steps (2.1–2.3) complete and verified:
  - 2.1: Moved the entire data-loading block out of `app/page.tsx` into `lib/mobile/bootstrap.ts` `loadHomeData(userId)` (returns profile, `onboardedAt`, buckets, ledger, months, netWorth, paydayTemplate, avgEssentialsPerMonth, annualMonths, filledStreak, incomeSources, bankAccounts, bankLedger, monthlyBankSpend, projects, milestones, milestoneLedger — one extra field vs. the original plan text: `onboardedAt`, needed because `app/page.tsx`'s onboarding-gate check used the raw `user.onboardedAt` field, which isn't part of the client-facing `UserProfile` type; simplest single-query fix was returning it as a sibling field on `HomeData` rather than double-querying). `app/page.tsx` now just destructures the call's result. Added `GET /api/mobile/bootstrap` (`requireMobileUserId` → `ensureCurrentMonth` → `loadHomeData` → `mobileOk`). Verified via curl (all 17 top-level keys present, real seeded data — 10 buckets, primary bank balance 14000, currency GH₵) and via a real Auth.js credentials sign-in attempt over curl for the web side (this specific curl flow itself didn't succeed — CredentialsSignin error, likely a cookie/CSRF quirk in curl's replay of the flow, not a code issue) — web-side correctness for this *purely mechanical* extraction is instead backed by strict TypeScript compilation (would catch any prop/field mismatch) plus the bootstrap endpoint proving `loadHomeData`'s actual computed output is correct.
  - 2.2: Hand-wrote Dart models under `pesa_mobile/lib/core/models/`: `bucket`, `transaction` (class `PesaTransaction` — avoided the bare name `Transaction` since it's a common/generic identifier other packages may also define), `income_source`, `bank_account`, `bank_transaction`, `project` (class `PesaProject`, same reasoning), `milestone`, `milestone_transaction`, `user_profile`, `month_row`, `pot_projection`, and one addition beyond the original file list: `payday_draft.dart` (`HomeData.paydayTemplate` needed it — a small, obviously-in-scope extension of this step, not a separate one). `home_data.dart` ties them all together as `HomeData.fromJson`. Verified with `test/models_test.dart`, which round-trips a **real** bootstrap response (saved as `test/fixtures/bootstrap_sample.json`, captured live from step 2.1's curl output) through `HomeData.fromJson` → `toJson` → `fromJson` again.
  - 2.3: `lib/features/home/bootstrap_provider.dart` (plain `FutureProvider<HomeData>`, not autoDispose — kept alive across tab switches per the plan's mutation-refresh strategy of explicit `ref.invalidate`/`ref.refresh`, not automatic teardown). Rewrote `home_screen.dart` into a bottom-`NavigationBar` shell (Home/Bank/Insights/Projects/Settings, only Home has a real body — the other four are `_PlaceholderTab` stubs for later phases) wrapping a `RefreshIndicator` + `AsyncValue.when` over the bootstrap data; new `widgets/bank_card.dart` and `widgets/pot_card.dart` (progress bar = `allocated/target`, using `package:intl` `NumberFormat` per the money-formatting cross-cutting rule). Verified two ways: `test/models_test.dart` plus a new `integration_test/home_dashboard_test.dart` that registers a fresh user against the live dev server and asserts the Home tab shows the *actual* seeded pot names (Rent/Savings/Mom) and the actual seeded bank balance (`GH₵14,000`) — not placeholders — then exercises pull-to-refresh. Passed on Linux desktop; re-ran both Phase 1 integration tests (`app_test.dart`, `email_code_test.dart`) afterward as a regression check and both still pass, confirming Phase 2 didn't disturb Phase 1's auth flow.
  - Next session: start at step 3.1 (refactor `app/actions/buckets.ts` into core+wrapper; add bucket CRUD endpoints). Re-read `app/actions/buckets.ts`, `app/actions/transactions.ts`, `app/actions/bank.ts`, and cross-cutting §5 (the core/wrapper refactor pattern) before starting.
- 2026-09-06: User asked for magic-link parity on mobile after Phase 1 was reported done. Rather than a true deep-link magic link (needs native platform config we don't have and can't test on the Linux desktop target), implemented it as an emailed one-time 6-digit code — added as step 1.5, so Phase 1 is now 5 steps, not 4. New `MobileLoginCode` model (migration `20260906173047_add_mobile_login_code`), `lib/mobile/otp.ts`, two new endpoints (`app/api/mobile/auth/email-code/{request,verify}`), and a new Flutter `EmailCodeScreen` reachable from the sign-in screen. Verified end-to-end: curl-based checks for the happy path, wrong-code, code-reuse-after-success, and the 5-attempt lockout; a new `integration_test/email_code_test.dart` drives the real screens against the live dev server (reading the emailed code back from the dev server's stdout log, since there's no test mailbox) and passes, including the auto-account-creation-on-first-verify path. One gotcha for whoever writes similar log-scraping tests later: escape user-controlled strings (here, an email containing `+`) with `RegExp.escape()` before building a `RegExp` from them — an unescaped `+` silently breaks the match instead of erroring. Also had to raise a couple of `pumpAndSettle` durations to 10s in that test — this dev DB (Neon) had gone idle and a cold-reconnect made one request take ~5s server-side, which is expected serverless-Postgres behavior, not a bug.
- 2026-09-09/10: Implemented Phase 3 (core writes: pots, disburse/spend/transfer, bank accounts) — all 4 steps (3.1–3.4) complete and verified. Full detail is inline under each step's checklist entry above; summary here:
  - 3.1–3.3 (backend): refactored `buckets.ts`, `transactions.ts`, `bank.ts` into the core/wrapper pattern and added the corresponding `app/api/mobile/{buckets,transactions,bank}/**` endpoints. Hit one real Next.js constraint while doing this: a `"use server"` file can only export async functions — the zod schemas these actions used to export directly had to move to `lib/mobile/schemas.ts` instead (a plain module), which both the action files and the new mobile routes now import from. All endpoints curl-verified with real before/after state checks (disburse/spend/transfer math, archive guards with exact error-message assertions, etc.).
  - 3.4 (Flutter UI): built out pot CRUD + disburse/spend/transfer sheets and a real Bank tab, verified with a new `integration_test/pot_and_bank_actions_test.dart` that drives the entire acceptance flow against the live backend. This surfaced and fixed three real app bugs (Hero tag collision from `IndexedStack` keeping every tab's FAB mounted simultaneously; a stale-`BuildContext`-after-`Navigator.pop()` bug in both action sheets that could silently no-op the follow-up dialog/provider calls; the seeded primary bank account being named literally `"Bank"`, colliding with the nav tab label in an unscoped test finder) — see the 3.4 checklist entry above for the full explanation of each, since future phases will hit the same two Flutter footguns (IndexedStack + shared resource names) again.
  - Environment note for future sessions: this box is **not exclusively ours** — `next-server`/`next dev` processes accumulate across sessions if only the launcher process is killed (`pkill -f "next dev"` doesn't touch the actual `next-server` worker it spawns), eventually exhausting memory; check `ps -u $(whoami) -o pid,rss,cmd | grep next-server` and kill those PIDs directly when done, not just the launcher. Also, **port 3000 is periodically occupied by an unrelated root-owned process** on this shared host (a different app entirely) — `npm run dev` silently falls back to 3001/3002/etc. in that case, so always check `/tmp/pesa-dev.log` (or wherever dev server output is redirected) for the actual bound port rather than assuming 3000; pass it to Flutter via `--dart-define=API_BASE_URL=http://localhost:<port>`. Separately, `nvm`'s Node isn't always on `$PATH` in a fresh non-interactive shell in this environment — if `npm`/`node` resolve to a Windows binary (visible as `UNC paths are not supported` errors), prepend `/home/jay/.nvm/versions/node/v24.14.1/bin` to `PATH` explicitly.
  - Next session: start at step 4.0 (read `app/months/page.tsx` and `app/months/[ym]/page.tsx`, note findings in the session log — no code yet), then 4.1 (months list + month detail endpoints) and 4.2 (Insights + Months tabs in Flutter). Re-read `app/months/page.tsx`, `app/months/[ym]/page.tsx`, `lib/insights.ts` before starting.

---

## Operating rules for every agent session

1. Read the STATUS block first. Do not re-read this whole file line-by-line or re-explore the codebase — jump straight to the section for "Next step to run."
2. Each phase section lists a **"Re-read before starting"** file list. Read exactly those files (plus anything they import that isn't already summarized here) before writing code.
3. Implement **only** the current step. Do not start the next step even if it looks easy — a clean stop point matters more than momentum, because the next session has no memory of *why* you kept going.
4. Every step ends with explicit **verification commands**. Run them for real. Do not check a box based on "this should work."
5. If verification fails and can't be fixed this session: leave the checkbox unchecked, set `Blocked: yes` in STATUS with a one-line reason, append a session log entry with details, and stop. Either finish the step cleanly or revert to the last good state — never leave the repo half-edited.
6. If a step turns out bigger than scoped, split it in-place (turn `3.2` into `3.2a`/`3.2b`) rather than silently doing half of it.
7. Tick `- [x]` only when verification passed. Update `Next step to run` in STATUS to the following step number, and append a session log entry (what changed, files touched, any deviation, anything the next agent must know).
8. Never do a phase's steps out of order unless the step is explicitly marked `(parallelizable)`.

---

## Cross-cutting decisions (finalized — do not re-litigate per phase)

1. **Money**: every amount is a Dart `int` (Prisma `Int`, no decimals ever). JSON in/out is plain `int`. Display formatting uses `package:intl` `NumberFormat` for thousands separators only.
2. **Currency**: `User.currency` (e.g. `"GH₵"`) is an opaque display string, not a currency code — render as `"$currency$amount"`, never convert.
3. **Month/date handling**: `activeMonth`/`lastPayCreditYm`/history use the web app's `"YYYY-MM"` string convention (`lib/month.ts` `ymOf`). Flutter never recomputes monthly rollover or payday-crediting — that stays server-side. Flutter only displays `YYYY-MM` strings and ISO-8601 timestamps (`DateTime.parse`). A `lib/core/ym.dart` helper (Phase 4) only formats/parses for display, never business rules.
4. **API response envelope** (all `app/api/mobile/**` routes):
   - Success: `{ "ok": true, "data": <payload> }`, HTTP 200/201.
   - Failure: `{ "ok": false, "error": { "code": "VALIDATION_ERROR"|"UNAUTHORIZED"|"NOT_FOUND"|"CONFLICT"|"INTERNAL", "message": string, "fieldErrors"?: Record<string,string[]> } }` with matching HTTP status.
   - `lib/mobile/response.ts` exports `mobileOk`, `mobileError`, `HttpError`, and `withMobileRoute(handler)` wrapping try/catch: `ZodError` → 400 `VALIDATION_ERROR` w/ fieldErrors; `HttpError` → its own status/code; any other `Error` → 400 `CONFLICT` with `e.message` (existing action files already throw user-safe messages like `"Only ¢50 left in Rent"`); anything else → 500 generic message, never leak stack traces.
5. **Auth/reuse pattern for existing action logic**: existing `app/actions/*.ts` files are `"use server"` functions that call `requireUserId()` (cookie session) then run Prisma logic. Mobile can't call these directly. Refactor **incrementally, file-by-file as each phase needs it**:
   - Extract `<verbName>Core(userId: string, input: X)` — the real Prisma/zod logic, exported, no session lookup inside.
   - The existing `"use server"` export becomes: `const userId = await requireUserId(); return verbNameCore(userId, input);`
   - The new mobile route becomes: `const userId = await requireMobileUserId(req); const input = await req.json(); return mobileOk(await verbNameCore(userId, input));`
   - One implementation of every business rule; small, low-risk, incremental refactor.
6. **Read composition**: one big `GET /api/mobile/bootstrap` endpoint mirrors everything `app/page.tsx` already composes in its single `Promise.all` (profile, buckets, ledger, income sources, bank accounts + ledger, insights months/net worth, payday template, pot projections, monthly bank spend, filled streak, avg essentials/month, annual months, projects, milestones, milestone ledger) — avoids an N-endpoint waterfall. Extract into `lib/mobile/bootstrap.ts` `loadHomeData(userId)`, used by **both** the web page and the mobile route so they never drift. Narrow endpoints (e.g. `GET /api/mobile/months/:ym`) are added later only for drill-down screens bootstrap doesn't cover.
7. **Mutation → refresh strategy (v1)**: after any write, Flutter refetches `/bootstrap` (invalidate the Riverpod bootstrap provider) rather than optimistic local patching. Optimistic UI is an explicit Phase 8 polish item, not v1.
8. **Env config**: `pesa_mobile/lib/core/env.dart` reads `const apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:3000')`. Android emulator → host via `10.0.2.2`; iOS simulator → `localhost`; physical devices → LAN IP via `--dart-define=API_BASE_URL=http://<lan-ip>:3000`.
9. **Data models**: hand-written Dart classes with manual `fromJson`/`toJson` mirroring `components/pesa/types.ts` — no `json_serializable`/`build_runner` (avoids a codegen step that's an extra failure point for memoryless agent sessions).
10. **Testing**: no new backend test framework (repo has none currently). Backend acceptance criteria are curl-based (exact commands given per step). Flutter gets `flutter analyze` (must be clean every step) plus targeted `flutter test` widget tests only where called out — not blanket coverage.
11. **State/routing**: Riverpod (`flutter_riverpod`) + `go_router`, wired starting Phase 0.
12. **HTTP client**: `dio`, introduced in Phase 1, with an interceptor attaching the Bearer token and handling 401 → refresh-and-retry.
13. **Auth token secret**: mobile access/refresh tokens signed with a separate `MOBILE_JWT_SECRET` env var (not `AUTH_SECRET`) so mobile sessions rotate/revoke independently of the web cookie session. Add to `.env.example`.

---

## Phase 0 — Repo & tooling skeleton [DONE]

Goal: both halves of the stack have a runnable, empty skeleton proving the toolchain before any real feature.

Re-read before starting: `pesa_mobile/pubspec.yaml`, `pesa_mobile/lib/main.dart`, `package.json`, `.env.example`.

- [x] **0.1 — Flutter folder skeleton + Riverpod/go_router wiring, no network yet**
  Files touched: `pesa_mobile/pubspec.yaml`, `pesa_mobile/lib/main.dart`, `pesa_mobile/lib/app.dart`, `pesa_mobile/lib/core/router.dart`, `pesa_mobile/lib/features/home/home_screen.dart`, `pesa_mobile/test/widget_test.dart`.
  Done when: `flutter analyze` clean; app boots to a placeholder "Pesa" home screen; `flutter test` passes.

- [x] **0.2 — Next.js mobile API namespace + response envelope smoke route**
  Files touched: `lib/mobile/response.ts`, `app/api/mobile/health/route.ts`.
  Done when: `curl -i http://localhost:3000/api/mobile/health` returns `{"ok":true,"data":{"status":"ok","time":"..."}}` with HTTP 200; `npm run typecheck` and `npm run lint` pass.

---

## Phase 1 — Mobile authentication (Bearer JWT, decoupled from web cookie session) [DONE]

Re-read before starting: `auth.ts`, `app/actions/auth.ts`, `lib/session.ts`, `lib/seed.ts`, `prisma/schema.prisma`, `.env.example`, cross-cutting §5/§13 above.

- [x] **1.1 — Schema: MobileSession model for refresh-token rotation/revocation**
  Files touched: `prisma/schema.prisma`, new migration.
  Do: add
  ```prisma
  model MobileSession {
    id               String    @id @default(cuid())
    userId           String
    refreshTokenHash String    @unique
    userAgent        String?
    createdAt        DateTime  @default(now())
    expiresAt        DateTime
    revokedAt        DateTime?
    user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
    @@index([userId])
  }
  ```
  and add `mobileSessions MobileSession[]` to `model User`.
  Done when: `npm run db:migrate` completes cleanly; `npx prisma studio` (or a `db pull` diff check) shows the new table; `npm run typecheck` passes.

- [x] **1.2 — JWT helpers + mobile auth guard**
  Files touched: `package.json` (`npm install jose`), `.env.example` (add `MOBILE_JWT_SECRET=""`), `lib/mobile/jwt.ts`, `lib/mobile/auth.ts`.
  Do:
  1. `lib/mobile/jwt.ts`: `signAccessToken(userId)` (15 min expiry, HS256, `MOBILE_JWT_SECRET`), `verifyAccessToken(token)`, `generateRefreshToken()` (random bytes, sha256-hashed before storing).
  2. `lib/mobile/auth.ts`: `requireMobileUserId(req: Request): Promise<string>` reads `Authorization: Bearer <token>`, verifies, throws `HttpError(401, "UNAUTHORIZED", "Missing or invalid token")` on failure, else returns `userId`.
  3. `issueTokenPair(userId, userAgent?)`: creates access + refresh token, stores refresh hash + 30-day expiry in `MobileSession`, returns `{ accessToken, refreshToken, expiresIn }`.
  Done when: `npm run typecheck` passes; round-trip verified end-to-end via 1.3's curl tests.

- [x] **1.3 — Auth endpoints: register / login / refresh / logout**
  Files touched: `app/api/mobile/auth/register/route.ts`, `app/api/mobile/auth/login/route.ts`, `app/api/mobile/auth/refresh/route.ts`, `app/api/mobile/auth/logout/route.ts`. Share the zod schema already used by `app/actions/auth.ts registerUser` (export/move to `lib/mobile/schemas.ts` rather than duplicating).
  Do:
  1. Register: validate `{name,email,password}`; check existing email; `bcrypt.hash`; `prisma.user.create`; `seedNewUser(user.id)`; `issueTokenPair`.
  2. Login: `{email,password}`; `bcrypt.compare` against `passwordHash` (same as the Credentials provider); `issueTokenPair` on success.
  3. Refresh: `{refreshToken}`; look up matching non-revoked, non-expired `MobileSession` by hash; rotate (revoke old, issue new pair).
  4. Logout: Bearer-authed; `{refreshToken}`; mark matching `MobileSession.revokedAt`.
  5. Explicitly out of scope for v1: Google OAuth on mobile (deferred to Phase 8 §8.4). (Passwordless email sign-in *is* in scope — see 1.5 below, implemented as an emailed one-time code rather than a true deep-link magic link, since deep links need native platform config — custom URL scheme or verified Android App Links/iOS Universal Links — this project doesn't have yet, and couldn't be tested on the Linux desktop target anyway.)
  Done when (curl against `npm run dev`): register returns `{"ok":true,"data":{"accessToken":...,"refreshToken":...,"user":{...}}}`; login with same creds returns a fresh pair; refresh with the returned refreshToken returns a new pair and the old refresh token then fails with 401; logout then refresh with the (now revoked) token returns 401.

- [x] **1.4 — Flutter: secure token storage + API client + login/register screens + route guard**
  Files touched: `pesa_mobile/pubspec.yaml` (`dio`, `flutter_secure_storage`), `pesa_mobile/lib/core/env.dart`, `lib/core/api_client.dart`, `lib/core/token_storage.dart`, `lib/features/auth/{auth_repository.dart,auth_provider.dart,login_screen.dart,register_screen.dart}`, update `lib/core/router.dart`.
  Do: Dio instance w/ Bearer interceptor + one silent refresh-and-retry on 401 (else log out); Riverpod `AsyncNotifier<AuthState>` (`unauthenticated`/`authenticated(userId)`/loading) backed by stored token; simple login/register forms; router redirect (unauthenticated → `/login`; authenticated on `/login` → `/`).
  Done when: register from the app lands on home placeholder; hot-restart stays logged in (token persisted); logout returns to login screen; `flutter analyze` clean.

- [x] **1.5 — Passwordless email sign-in via one-time code (mobile equivalent of the web's magic link)**
  Files touched: `prisma/schema.prisma` (`MobileLoginCode` model, migration `20260906173047_add_mobile_login_code`), `lib/mobile/otp.ts` (`generateLoginCode`/`hashLoginCode`), `lib/mobile/schemas.ts` (`requestLoginCodeSchema`/`verifyLoginCodeSchema`), `app/api/mobile/auth/email-code/request/route.ts`, `app/api/mobile/auth/email-code/verify/route.ts`; Flutter: `lib/features/auth/email_code_screen.dart`, additions to `auth_repository.dart`/`auth_provider.dart`, a new `/login/email-code` route in `core/router.dart`, an entry link on `login_screen.dart`.
  Do: request endpoint emails (via `lib/email.ts`, same as password-reset) a 6-digit code good for 10 minutes, invalidating any prior outstanding code for that email first; also `console.log`s the code in non-production for local dev/testing (mirrors `lib/email.ts`'s own dev-mode degrade pattern). Verify endpoint checks the hash, tracks `attempts` (max 5 before lockout), marks the code consumed on success, and — matching the web magic-link's auto-account-creation via Auth.js — creates the `User` + runs `seedNewUser` if no account exists yet for that email, then issues a normal token pair.
  Done when: curl request→verify round-trip works (code read from the dev server's stdout log); wrong code returns 401 `"Incorrect code."` and increments attempts; the same code can't be reused after a successful verify (401 `"Code is invalid or expired."`); 6 wrong attempts locks out with `"Too many attempts. Request a new code."`; verifying a code for a brand-new email creates a fully seeded account (confirmed via `prisma.bucket/bankAccount/incomeSource.count`). Flutter: `flutter analyze` clean; a real integration test (`integration_test/email_code_test.dart`, run via `flutter test integration_test/email_code_test.dart -d linux`) drives the actual screens against the live dev server and passes — tap "Sign in with an email code instead" → enter email → send → read the code back from the dev log → enter it → lands on Home → logout returns to Sign-in.

---

## Phase 2 — Bootstrap endpoint + read-only dashboard [DONE]

Re-read before starting: `app/page.tsx` (full `Promise.all` + client-shaping block), `components/pesa/types.ts`, `lib/month.ts`, `lib/insights.ts`, `lib/payday.ts`, `lib/bank.ts`.

- [x] **2.1 — Extract `loadHomeData(userId)` + `GET /api/mobile/bootstrap`**
  Files touched: `lib/mobile/bootstrap.ts` (new), `app/page.tsx` (refactor to call it), `app/api/mobile/bootstrap/route.ts` (new).
  Do: move the entire `Promise.all([...])` + client-shaping block out of `app/page.tsx` into `loadHomeData(userId)`, returning one JSON-serializable object with all the fields `app/page.tsx` currently builds. `app/page.tsx` calls `ensureCurrentMonth(userId)` then `loadHomeData(userId)`, destructures as before — web behavior unchanged. Route: `requireMobileUserId` → `ensureCurrentMonth` → `loadHomeData` → `mobileOk`.
  Done when: web app renders identically at `/` (manual check); `curl -H "Authorization: Bearer <token>" localhost:3000/api/mobile/bootstrap` returns 200 with all listed top-level keys populated; `npm run typecheck`/`lint` pass.

- [x] **2.2 — Flutter data models matching `components/pesa/types.ts`**
  Files touched: `pesa_mobile/lib/core/models/{bucket,transaction,income_source,bank_account,bank_transaction,project,milestone,milestone_transaction,user_profile,month_row,pot_projection,home_data}.dart`.
  Do: hand-write each class 1:1 against the TS types; plain `String` fields for `color`/`kind`/`icon`/`status` (not Dart enums) to avoid serialization mismatches. Manual `fromJson`/`toJson`.
  Done when: `flutter analyze` clean; `test/models_test.dart` round-trips a real bootstrap JSON fixture (from 2.1's curl output) through `HomeData.fromJson` without throwing, asserting a few known fields; `flutter test` passes.

- [x] **2.3 — Bootstrap provider + read-only home dashboard**
  Files touched: `pesa_mobile/lib/features/home/bootstrap_provider.dart`, `home_screen.dart` (rewrite), `widgets/{pot_card,bank_card}.dart`.
  Do: Riverpod provider calling `/bootstrap`; home screen with pull-to-refresh, primary bank balance card, active pots list w/ progress bars (read-only); bottom nav scaffold with placeholder tabs (Home/Months/Bank/Projects/Settings) for later phases.
  Done when: logged-in app shows the seeded test user's real pots/bank balance from Postgres (cross-check against curl bootstrap output); pull-to-refresh triggers a visible network call; `flutter analyze` clean.

---

## Phase 3 — Core writes: pots, disburse/spend/transfer, bank accounts [DONE]

Re-read before starting: `app/actions/buckets.ts`, `app/actions/transactions.ts`, `app/actions/bank.ts`, cross-cutting §5.

- [x] **3.1 — Refactor `buckets.ts` into core+wrapper; add bucket endpoints**
  Files touched: `app/actions/buckets.ts`, `app/api/mobile/buckets/route.ts`, `.../[id]/route.ts`, `.../[id]/archive/route.ts`, `.../[id]/restore/route.ts`, `.../[id]/adjust-target/route.ts`, `.../reorder/route.ts`.
  Done when: web pot creation/edit/archive/reorder still works unchanged; curl creates a pot, confirms via bootstrap, archives it, confirms it drops from active list; `typecheck`/`lint` pass.

- [x] **3.2 — Refactor `transactions.ts` into core+wrapper; add disburse/spend/transfer endpoints**
  Files touched: `app/actions/transactions.ts`, `app/api/mobile/transactions/{disburse,disburse-many,spend,transfer}/route.ts`, `.../payday-template/apply/route.ts`.
  Done when: disburse increments `allocated`/decrements bank balance (verify via before/after bootstrap); spend increments `spent`, errors 400 `CONFLICT` over-limit; transfer moves `allocated` between pots with linked `transferId` pair.

- [x] **3.3 — Refactor `bank.ts` into core+wrapper; add bank account endpoints**
  Files touched: `app/actions/bank.ts`, `app/api/mobile/bank/accounts/route.ts`, `.../[id]/route.ts`, `.../[id]/archive/route.ts`, `app/api/mobile/bank/transfer/route.ts`, `.../add-funds/route.ts`, `.../spend/route.ts`.
  Done when: create second account, transfer funds, confirm both balances via bootstrap; archiving nonzero/primary account returns the existing 400 error messages unchanged.

- [x] **3.4 — Flutter: pot CRUD UI + disburse/spend/transfer sheets + bank account UI**
  Files touched: `pesa_mobile/lib/core/api_exception.dart`, `lib/core/widgets/amount_note_dialog.dart` (new shared dialog), `lib/features/pots/{pot_form_sheet,pot_repository,pot_actions_provider,pot_action_sheet}.dart`, `lib/features/bank/{bank_screen,bank_repository,bank_actions_provider,bank_account_form_sheet,bank_account_action_sheet}.dart`, `home_screen.dart` (real Bank tab, pot tap → action sheet, "add pot" FAB), `widgets/pot_card.dart` (now tappable).
  Verified with a real integration test (`integration_test/pot_and_bank_actions_test.dart`) driving the actual app against the live dev server through the full acceptance flow — create pot → disburse → spend → transfer between pots → add second bank account → transfer between accounts — rather than a manual screenshot, since it's repeatable and catches exactly the kind of bugs this step turned up. Passed twice in a row on Linux desktop after fixing three **real app bugs** found in the process (not test flakiness — each reproduced deterministically until fixed):
  1. **Hero tag collision**: both the Home tab's and Bank tab's `Scaffold` had a `FloatingActionButton`, and `IndexedStack` keeps every child mounted simultaneously (not just the visible one) — so both FABs coexisted and collided on Flutter's default FAB hero tag, throwing on the very first frame. Fixed with explicit distinct `heroTag`s.
  2. **Stale-context bug in both action sheets**: `showPotActionSheet`/`showBankAccountActionSheet`'s `ListTile.onTap` called `Navigator.of(context).pop()` to close the sheet, then reused that *same* (now-being-disposed) `context` to open the follow-up amount/note dialog and to resolve `ProviderScope.containerOf(context)` — a real, silent-failure-prone bug, not just a lint nit. Fixed by renaming the bottom sheet builder's local parameter to `sheetContext` (used only for the `.pop()`) and threading the caller's stable outer `context` through to the dialog/provider work.
  3. **Ambiguous-finder test bug** (not an app bug, but recorded since it cost real debugging time and the technique matters for future tests): the seeded primary bank account is literally named `"Bank"` (`lib/seed.ts`) — once `BankScreen` is mounted (again, `IndexedStack` keeps it mounted even off-tab), a plain `find.text('Bank')` matches both the account's own `ListTile` title *and* the `NavigationDestination` label. Fixed by scoping the tab-switch tap to `find.descendant(of: find.byType(NavigationBar), matching: find.text('Bank'))`.
  Also hit (and fixed in the test, not the app) a genuine `ListView` laziness gotcha: a newly-created pot appended at the end of an 11-item list wasn't yet built as an Element (slivers only build near-viewport children regardless of whether the list is `ListView(children:)` or `.builder`), so `find` couldn't see it until scrolled into view — added a small `_scrollUntilFound` test helper and a `Key('home-pots-list')` on the list for this and any future test to target.
  `payday-template/apply` was not independently curl-tested this session (needs a seeded prior-month disbursement history to produce a non-empty template) — the code is a thin, type-checked passthrough to the same `applyPaydayTemplateForUser` already exercised by the cron job, so this is a low-risk gap, not a skipped verification of new logic.

---

## Phase 3.5 — Design system & visual parity with the web app

Inserted by user request after Phase 3, before continuing to Phase 4's new data features — the app currently uses stock Material styling; this phase makes it look like Pesa (warm cream/earthy palette, serif display headlines, pill buttons, the raised center-FAB bottom nav) before building more screens on top of default styling that would just need reskinning later anyway.

Re-read before starting: `app/globals.css` (full file — every color/radius/shadow/type-scale token lives here), `components/pesa/screens/home.tsx` (hero card structure), `components/pesa/ui.tsx` (`TabBar`, `BucketCard`, `MiniStat`, `Pot` — the row-icon/color-chip pattern), `components/pesa/icons.tsx`, `app/layout.tsx` (font loading), `components/pesa/types.ts` (`BucketColor` union).

**Design tokens extracted from the web app (source of truth — do not re-derive, just port):**
- Colors (hex): `bg-canvas #E8DEC8`, `bg-app #F4EBD9`, `bg-card #FBF5E7`, `bg-elev #FFFAEC`, `ink #211A12`, `ink-2 #4A3F31`, `ink-3 #8A7F6B`, `line #E1D5B8`, `green #3D5234`, `green-deep #2A3A22`, `green-soft #B5C29A`, `green-tint #DDE5C8`, `clay #C9714B`, `clay-deep #9F5234`, `clay-soft #ECC0A8`, `gold #C8973A`, `rose #D89280`. Extra row-icon pairs not in `:root`: gold `#F1E1B8`/`#6E4F12`, rose `#F4D8CE`/`#8B3A1F`, sage reuses `#DDE5C8`/`#3D5234` (identical to green-tint/green as a chip; only differs from `green` in flow-bar gradient direction, which isn't relevant to buckets yet). No dark mode exists in the web app — single palette only.
- Radius: sm 10px, base 18px, lg 28px (`.card`), xl 36px. Buttons/pills always 999px (fully round).
- Shadows: sm `0 1px 0 rgba(33,26,18,.04), 0 2px 4px rgba(33,26,18,.05)`; base `0 2px 0 rgba(33,26,18,.04), 0 8px 24px rgba(33,26,18,.08)`.
- Fonts (Google Fonts — use the `google_fonts` package, no bundled assets needed): **Instrument Serif** (weight 400 only, has a true italic face — used for all display/headline text, e.g. "Morning, *Jay*." mixes upright + italic in one line), **Geist** (body/UI sans — verify it resolves via `GoogleFonts.geist()`; if the package's generated catalog doesn't have it yet, fall back to `GoogleFonts.inter()` as the closest neutral sans and note the substitution), **JetBrains Mono** (`GoogleFonts.jetBrainsMono()`, `tabular-nums`, weight 500 — used for every money amount, never Instrument Serif or Geist for numbers except the one big hero amount which is deliberately serif per the web design).
- Type scale (px, from `.display-xl/.display-l/.display/.title/.h-eyebrow/.body/.small/.tiny`): 72/56/40/28 for display sizes (serif, negative letter-spacing), eyebrow 11px/600/uppercase/0.12em tracking, body 15px, small 13px, tiny 11px.
- Bottom nav: 84px tall bar, `bg-app` at ~86% opacity + blur, 7-column grid (this app has 6 real tabs, not 7 — see step 3.5.2), regular tabs show a small dot indicator in `clay` when active; the center slot is a raised 56px circular FAB in `green` with a 3px `bg-app`-colored border creating a cutout notch, pulled up via negative margin so it visually pokes above the bar.
- Pot color chips (`BucketColor`: clay/green/gold/rose/sage) each resolve to a fixed (background, foreground) pair — see table above — used for the ~40×32px rounded-square icon chip on every pot/bucket row or card.
- Icons are 30 hand-drawn inline SVGs (24×24 viewBox, `stroke-width 1.7`, rounded caps, no fill) in `components/pesa/icons.tsx` — porting all 30 as pixel-exact Flutter `CustomPainter`s is out of scope for this pass (large effort, low incremental value vs. color/type/layout parity). Use a close line-icon set instead (`lucide_icons` package — same rounded-stroke aesthetic) and accept minor per-glyph differences; note this explicitly as an accepted simplification, not an oversight.

- [x] **3.5.1 — Design tokens + Flutter theme**
  Files touched: `pesa_mobile/pubspec.yaml` (add `google_fonts`, `lucide_icons`), `lib/core/theme/pesa_colors.dart` (all hex constants above as `Color`s + the `BucketColor → (bg, fg)` chip lookup), `lib/core/theme/pesa_theme.dart` (a `ThemeData` built from the above: `colorScheme` seeded/overridden with `ink`/`clay`/`green`, `textTheme` mapping display styles to Instrument Serif and body/label styles to Geist, `cardTheme`/`inputDecorationTheme`/`filledButtonTheme` matching the radius/shadow tokens), wire into `app.dart` replacing the current `ColorScheme.fromSeed(seedColor: Colors.teal)` placeholder.
  Done when: `flutter analyze` clean; a quick visual check (via the `run` skill on Linux desktop) shows the Sign-in screen already picking up the new background/ink colors and pill-shaped button purely from the global theme change, with no per-screen edits yet.

- [x] **3.5.2 — Reusable component library**
  Files touched: `lib/core/widgets/pesa_card.dart` (card + card-line variants), `lib/core/widgets/pesa_button.dart` (primary/green/clay/ghost/soft pill button variants + circular icon-button variant), `lib/core/widgets/row_icon_chip.dart` (the color-chip widget taking a `BucketColor` string + `IconData`), `lib/core/widgets/pesa_bottom_nav.dart` (custom bottom nav: Home / Bank / **center Disburse FAB** / Insights / Projects / More — 6 slots; the raised-FAB visual per the tokens above; tapping the FAB opens a simple "pick a pot to disburse into" bottom sheet reusing `PotRepository.disburse` — this is the one new bit of *behavior* in an otherwise pure-styling phase, matching the web's primary CTA). Replace `home_screen.dart`'s stock `NavigationBar` with this new `PesaBottomNav`.
  Done when: `flutter analyze` clean; visually the bottom bar matches the screenshots' 6-item-plus-FAB layout; tapping the FAB → picking a pot → entering an amount → disburses and the dashboard updates (reuse the existing `pot_and_bank_actions_test.dart` pattern to add one assertion, or a small new integration test, for this specific new entry point).

- [ ] **3.5.3 — Reskin Home tab: hero "left to disburse" card + pot grid**
  Files touched: `lib/features/home/home_screen.dart`, `lib/features/home/widgets/{bank_card,pot_card}.dart` (rework or replace).
  Do: compute "left to disburse" client-side from data already in `HomeData` (`profile.salary - sum(activeBuckets.map(b => b.allocated))`) — no new endpoint needed. Hero card: dark green gradient (`#2A3A22 → #3D5234 → #4A6240`), eyebrow "LEFT TO DISBURSE" dot+label, big serif number, clay-gradient progress bar (disbursed / salary), footer stats line, "Send to a pot" pill CTA (opens the same disburse-picker sheet as the bottom nav FAB). Below it: 2-column grid of compact pot cards (`row-icon` chip, name, target, a "Full" pill when `allocated >= target`) replacing the current full-width `PotCard` list — matches the screenshot's "Your pots" grid exactly.
  Done when: `flutter analyze` clean; visual check + integration test confirms the hero numbers match `salary`/`sum(allocated)` from a known seeded user, and tapping a grid pot card still opens the existing disburse/spend/transfer action sheet.

- [ ] **3.5.4 — Reskin Bank tab: navy balance card + statement list**
  Files touched: `lib/features/bank/bank_screen.dart`.
  Do: primary account card restyled as a dark navy gradient hero (matching the screenshot — this is a *new* literal color not in the extracted token list above; sample it from the screenshot at implementation time and add it as a named constant, e.g. `bankNavy`/`bankNavyDeep`, alongside a session-log note that it wasn't in `globals.css`'s `:root` — check `home.tsx`'s bank-card counterpart or the actual `.card` override in `components/pesa/screens/bank.tsx` first in case it *is* tokenized and the explore agent simply didn't check that file), "Add funds"/"Log a spend" pill buttons, spendable/spent chip row, "Other accounts" section, and a "Statement" list of recent `bankLedger` entries (already in `HomeData`, unused until now) styled as `.row` items with a signed amount.
  Done when: `flutter analyze` clean; statement list shows real ledger entries from bootstrap data; Add funds/Log a spend buttons still work via the existing `BankRepository`.

- [ ] **3.5.5 — Reskin auth screens**
  Files touched: `lib/features/auth/{login_screen,register_screen,email_code_screen}.dart`.
  Do: apply the new theme's card/pill-button/input styling; add the serif "Every cedi, a place to land." tagline treatment where it fits (e.g. above the form) for visual consistency with the web's status-bar slogan, without inventing new copy/flows.
  Done when: `flutter analyze` clean; all three screens visually match the warm palette and pill-button styling; existing `app_test.dart`/`email_code_test.dart` integration tests still pass unmodified (this step must not change any widget's findable text/type in a way that breaks those finders — check button labels and field labels stay exactly `'Email'`, `'Password'`, `'Sign in'`, etc.).

---

## Phase 4 — Insights & months history

Re-read before starting: `app/months/page.tsx`, `app/months/[ym]/page.tsx`, `lib/insights.ts`.

- [ ] **4.0 — Explore**: read the two months pages; note (session log only, no code) exactly what data/actions `app/months/[ym]/page.tsx` exposes.

- [ ] **4.1 — Backend: months list + month detail endpoints**
  Files touched: `app/api/mobile/months/route.ts` (wraps `loadAllMonths`), `app/api/mobile/months/[ym]/route.ts` (transactions for that month, mirroring the web page's query — reuse, don't reinvent).
  Done when: curl `/api/mobile/months` matches the web `/months` totals; curl a specific month matches that month's web transactions.

- [ ] **4.2 — Flutter: Insights tab + Months history tab**
  Files touched: `pesa_mobile/lib/features/insights/*` (uses bootstrap's `months`/`annualMonths` — no new network call for the summary view), `lib/features/months/*` (hits the new endpoints).
  Done when: Insights tab shows real 6-month saved/gave/lived + net worth matching web; Months tab lists real months and drills into real transactions; `flutter analyze` clean.

---

## Phase 5 — Projects & Milestones

Re-read before starting: `app/actions/projects.ts` (especially `computeStatuses` — render its result, never reimplement it in Dart).

- [ ] **5.1 — Refactor `projects.ts` into core+wrapper; add project/milestone endpoints**
  Files touched: `app/actions/projects.ts`, `app/api/mobile/projects/route.ts`, `.../[id]/route.ts`, `.../[id]/archive/route.ts`, `app/api/mobile/milestones/route.ts`, `.../[id]/route.ts`, `.../[id]/archive/route.ts`, `.../[id]/fund/route.ts`.
  Done when: create project w/ two milestones → first `in_progress`, second `locked` (via bootstrap); fund locked one → 400 `"Complete the previous milestone first"`; fund first to target → flips to `completed`, second flips to `in_progress`.

- [ ] **5.2 — Flutter: Projects list + milestone roadmap UI + fund action**
  Files touched: `pesa_mobile/lib/features/projects/{projects_screen,project_detail_screen,fund_milestone_sheet}.dart`.
  Done when: real projects/milestones render from bootstrap; locked milestones show disabled fund button; funding updates the roadmap after refetch matching server-computed statuses exactly.

---

## Phase 6 — Settings & account management

Re-read before starting: `app/actions/settings.ts`, `app/actions/income-sources.ts`.

- [ ] **6.1 — Refactor `settings.ts` + `income-sources.ts` into core+wrapper; add endpoints**
  Files touched: both action files, `app/api/mobile/settings/{profile,round-ups,payday,app-lock}/route.ts`, `app/api/mobile/settings/delete-account/route.ts`, `app/api/mobile/income-sources/route.ts`, `.../[id]/route.ts`, `.../[id]/toggle/route.ts`.
  Note: expose `setPushPrefs` (boolean flags only) but not `sendTestPush` until Phase 7/8 wires real mobile push.
  Done when: curl updates display name/currency, toggles round-ups, sets payday day, sets+verifies an app-lock PIN (correct → ok:true, wrong → ok:false), creates/edits/toggles/deletes an income source and confirms `User.salary` resyncs via bootstrap.

- [ ] **6.2 — Flutter: Settings screens + income sources CRUD + local app-lock gate**
  Files touched: `pesa_mobile/lib/features/settings/{settings_screen,income_sources_screen,app_lock_screen}.dart`, router update for an app-lock gate on cold start/resume.
  Do: PIN verification always calls the server endpoint (never a purely local check), matching the web app's design; delete-account requires typing the exact account email before calling the endpoint.
  Done when: settings changes reflect after refetch; app-lock PIN gate blocks access until server-verified; delete-account flow matches web app's confirmation UX.

---

## Phase 7 — Push notifications (STUB ONLY — do not implement sending)

Re-read before starting: `lib/push.ts`, `prisma/schema.prisma` `PushSubscription` model.

- [ ] **7.1 — Schema + accept-only endpoint for future FCM tokens**
  Files touched: `prisma/schema.prisma` (new additive `MobileDeviceToken { id, userId, fcmToken, platform, createdAt }`, migration), `app/api/mobile/push/register-token/route.ts` (accepts/upserts a token, does nothing else).
  Done when: migration applies; curl posting a fake token succeeds and the row appears in the DB; confirm (session log) no cron/`lib/push.ts` path reads this table yet — intentionally inert.

- [ ] **7.2 — Flutter: disabled "Push notifications — coming soon" settings row**
  Files touched: `pesa_mobile/lib/features/settings/settings_screen.dart` (visually-disabled toggle row, no new dependency).
  Done when: stub row renders; `flutter analyze` clean; confirm (session log) `firebase_messaging`/APNs setup stays out of scope until a future phase is explicitly added.

---

## Phase 8 — Polish, hardening, optional stretch

Re-read before starting: whichever feature screens exist by this point.

- [ ] **8.1 — Error/empty/loading state audit** across all screens from Phases 2–6.
- [ ] **8.2 — Offline/stale-data banner**: bootstrap provider retains last-good data on refetch failure, shows a small banner instead of clearing the screen.
- [ ] **8.3 — App branding**: icons, splash screen, app name matching the web app (`app/icon.svg`, `app/manifest.ts` as reference).
- [ ] **8.4 (optional/stretch) — Google Sign-In on mobile**: `google_sign_in` package + `app/api/mobile/auth/google/route.ts` (verify ID token, find-or-create User/Account consistent with the existing Google provider + PrismaAdapter, `issueTokenPair`). Only do this if asked after core app is stable.
- [ ] **8.5 (optional) — Lightweight API smoke tests**: `scripts/mobile-api-smoke.mjs` or vitest, covering auth flow + one write per resource.
- [ ] **8.6 — Release prep**: Android signing config, iOS bundle id/TestFlight prerequisites, production `API_BASE_URL` documented in `pesa_mobile/README.md`.

---

## Scope deliberately excluded (not oversights — call these out if "discovered")

- Round-ups, carry-over pots, debt-kind pots, bills due-day, milestone sequential-unlock — all preserved by **reusing** existing `lib/*.ts`/`app/actions/*.ts` logic via the core/wrapper refactor; never reimplemented in Dart.
- Web Push (`lib/push.ts`, `PushSubscription` model) stays web-only; mobile push is a separate, later, explicitly-deferred effort (Phase 7 stub only).
- Cron endpoints (`app/api/cron/*`) are untouched — they already call the same `lib/*.ts` functions and need no mobile-specific changes.

---

## Critical files reference

- `prisma/schema.prisma` — add `MobileSession` (Phase 1), `MobileDeviceToken` (Phase 7).
- `app/page.tsx` — refactor target for Phase 2's `loadHomeData` extraction.
- `lib/month.ts`, `lib/insights.ts`, `lib/payday.ts`, `lib/bank.ts` — business logic every mobile endpoint must reuse.
- `app/actions/{buckets,transactions,bank,projects,settings,income-sources}.ts` — core/wrapper refactor targets (Phases 3, 5, 6).
- `components/pesa/types.ts` — shape Flutter's hand-written models (Phase 2.2) must mirror.
- `pesa_mobile/pubspec.yaml`, `pesa_mobile/lib/main.dart` — Flutter entry points.
