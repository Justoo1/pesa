// Pre-release checks for the web server and the mobile app.
//
//   npm run check:release                      repo checks only
//   npm run check:release -- --env FILE        + production env vars (e.g. from `vercel env pull FILE`)
//   npm run check:release -- --url https://pesa.edtmsys.com   + live public pages / API
//
// Exits 1 if any check fails. Warnings don't fail the run.
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const args = process.argv.slice(2)
const argAfter = (flag) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : undefined
}

let failures = 0
const ok = (msg) => console.log(`  ✓ ${msg}`)
const warn = (msg) => console.log(`  ! ${msg}`)
const fail = (msg) => {
  failures++
  console.log(`  ✗ ${msg}`)
}
const read = (rel) => readFileSync(path.join(root, rel), "utf8")

// --- Repo ---------------------------------------------------------------
console.log("\nRepo")
const legal = read("lib/legal.ts")
if (/PUBLISHER_NAME = "\[/.test(legal)) {
  fail("lib/legal.ts PUBLISHER_NAME is still a placeholder — put your legal name (must match the store developer name)")
} else ok("publisher name set in lib/legal.ts")

const pubspec = read("pesa_mobile/pubspec.yaml")
const version = pubspec.match(/^version:\s*(\S+)/m)?.[1]
ok(`app version ${version} (bump the +build number for every store upload)`)

const appDir = "pesa_mobile/android"
if (existsSync(path.join(root, appDir, "key.properties"))) ok("android/key.properties present (release signing)")
else fail("pesa_mobile/android/key.properties missing — release would be debug-signed (see pesa_mobile/README.md)")

if (existsSync(path.join(root, appDir, "app/google-services.json"))) ok("google-services.json present (Android push)")
else warn("no android/app/google-services.json — phone push stays off on Android (docs/FIREBASE_SETUP.md)")

if (existsSync(path.join(root, "pesa_mobile/ios/Runner/GoogleService-Info.plist")))
  ok("GoogleService-Info.plist present (iOS push)")
else warn("no ios/Runner/GoogleService-Info.plist — phone push stays off on iOS")

for (const f of ["ios/Runner/PrivacyInfo.xcprivacy", "ios/Runner/Runner.entitlements"]) {
  if (existsSync(path.join(root, "pesa_mobile", f))) ok(`${f} present`)
  else fail(`pesa_mobile/${f} missing`)
}
if (read("pesa_mobile/ios/Runner/Info.plist").includes("ITSAppUsesNonExemptEncryption"))
  ok("iOS export-compliance key set")
else fail("Info.plist lacks ITSAppUsesNonExemptEncryption")

// --- Production env -----------------------------------------------------
const envFile = argAfter("--env")
if (envFile) {
  console.log(`\nProduction env (${envFile})`)
  const env = {}
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
  const need = (k, test, why) => {
    const v = env[k]
    if (!v) return fail(`${k} is not set${why ? ` — ${why}` : ""}`)
    if (test && !test(v)) return fail(`${k} looks wrong${why ? ` — ${why}` : ""}`)
    ok(`${k} set`)
  }
  need("DATABASE_URL", (v) => !/localhost|127\.0\.0\.1/.test(v), "must be the Neon production URL")
  need("DATABASE_URL_UNPOOLED", (v) => !/localhost|127\.0\.0\.1/.test(v), "direct Neon URL for migrations")
  need("AUTH_SECRET", (v) => v.length >= 32, "npx auth secret")
  need("AUTH_URL", (v) => v.startsWith("https://"), "public https origin, e.g. https://pesa.edtmsys.com")
  need("MOBILE_JWT_SECRET", (v) => v.length >= 32, "openssl rand -hex 32")
  need("CRON_SECRET", (v) => v.length >= 16, "random string, ≥16 chars")
  need("AUTH_RESEND_KEY", null, "sign-in emails can't be sent without it")
  need("AUTH_EMAIL_FROM", (v) => !v.includes("resend.dev"), "use a verified sender on your own domain")
  need("VAPID_PUBLIC_KEY")
  need("VAPID_PRIVATE_KEY")
  need("NEXT_PUBLIC_VAPID_PUBLIC_KEY", (v) => v === env.VAPID_PUBLIC_KEY, "must equal VAPID_PUBLIC_KEY")
  if (env.RATE_LIMITS_DISABLED) warn("RATE_LIMITS_DISABLED is set — ignored in production, but remove it")
  if (env.FCM_SERVICE_ACCOUNT) ok("FCM_SERVICE_ACCOUNT set (phone push on)")
  else warn("FCM_SERVICE_ACCOUNT not set — phone push off")
  if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) ok("Google sign-in (web) configured")
  else warn("AUTH_GOOGLE_ID/SECRET not set — the web 'Sign in with Google' button won't work")
}

// --- Live site ----------------------------------------------------------
const url = argAfter("--url")?.replace(/\/$/, "")
if (url) {
  console.log(`\nLive (${url})`)
  for (const p of ["/privacy", "/terms", "/support", "/delete-account"]) {
    try {
      const res = await fetch(url + p, { redirect: "manual" })
      if (res.status === 200) ok(`${p} is public (200)`)
      else fail(`${p} returned ${res.status} — store reviewers must reach it signed out`)
    } catch (e) {
      fail(`${p} unreachable (${e.message})`)
    }
  }
  try {
    const res = await fetch(`${url}/api/mobile/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "release-check@invalid.example", password: "not-a-real-password" }),
    })
    if (res.status === 401 || res.status === 429) ok(`mobile API answers (${res.status})`)
    else fail(`mobile API login returned ${res.status} (expected 401)`)
  } catch (e) {
    fail(`mobile API unreachable (${e.message})`)
  }
}

console.log(failures ? `\n${failures} check(s) failed.\n` : "\nAll checks passed.\n")
process.exit(failures ? 1 : 0)
