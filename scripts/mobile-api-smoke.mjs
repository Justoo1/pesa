#!/usr/bin/env node
// Smoke test for the mobile REST API (app/api/mobile/**). Runs against a live
// server and a real database, creating one throwaway user:
//
//   npm run dev                      # in another terminal
//   npm run smoke:mobile             # or: BASE_URL=https://… node scripts/mobile-api-smoke.mjs
//
// Covers the auth flow (register → login → refresh rotation → logout) and one
// write per resource, asserting each effect through /bootstrap. Exits non-zero
// on the first failure.

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "")
let passed = 0

async function call(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}/api/mobile${path}`, {
    method,
    headers: {
      ...(body !== undefined && { "content-type": "application/json" }),
      ...(token && { authorization: `Bearer ${token}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let json
  try {
    json = await res.json()
  } catch {
    throw new Error(`${method} ${path} → ${res.status}, non-JSON response (is the route deployed?)`)
  }
  return { status: res.status, json }
}

function check(name, condition, detail) {
  if (!condition) {
    console.error(`✗ ${name}${detail ? `\n  ${JSON.stringify(detail)}` : ""}`)
    process.exit(1)
  }
  passed++
  console.log(`✓ ${name}`)
}

async function ok(name, method, path, opts) {
  const r = await call(method, path, opts)
  check(name, r.json?.ok === true, r.json)
  return r.json.data
}

const email = `smoke+${Date.now()}@pesa.dev`
const password = "smoke-password-123"

// --- auth ---
const health = await ok("health", "GET", "/health")
check("health reports ok", health.status === "ok")

const reg = await ok("register", "POST", "/auth/register", {
  body: { name: "Smoke Test", email, password },
})
const dup = await call("POST", "/auth/register", { body: { name: "Smoke", email, password } })
check("duplicate register rejected", dup.json.ok === false)

const bad = await call("POST", "/auth/login", { body: { email, password: "wrong-password" } })
check("wrong password → 401", bad.status === 401)
const login = await ok("login", "POST", "/auth/login", { body: { email, password } })
let token = login.accessToken

const refreshed = await ok("refresh", "POST", "/auth/refresh", {
  body: { refreshToken: login.refreshToken },
})
const reused = await call("POST", "/auth/refresh", { body: { refreshToken: login.refreshToken } })
check("rotated refresh token can't be reused", reused.status === 401)
token = refreshed.accessToken

const noAuth = await call("GET", "/bootstrap")
check("bootstrap without token → 401", noAuth.status === 401)

const boot = () => ok("bootstrap", "GET", "/bootstrap", { token })
let data = await boot()
check("seeded pots and primary account", data.buckets.length > 0 && data.bankAccounts.length > 0)
const startBank = data.bankAccounts.find((a) => a.isPrimary).balance

// --- pots + transactions ---
const pot = await ok("create pot", "POST", "/buckets", {
  token,
  body: { name: "Smoke pot", target: 1000, color: "green", icon: "piggy", kind: "future" },
})
await ok("disburse", "POST", "/transactions/disburse", {
  token,
  body: { bucketId: pot.id, amount: 300 },
})
const overfill = await call("POST", "/transactions/disburse", {
  token,
  body: { bucketId: pot.id, amount: 800 },
})
check("can't fill a pot past its target", overfill.status === 400, overfill.json)
await ok("spend", "POST", "/transactions/spend", { token, body: { bucketId: pot.id, amount: 100 } })
const overspend = await call("POST", "/transactions/spend", {
  token,
  body: { bucketId: pot.id, amount: 10_000 },
})
check("overspend → 400 with a readable message", overspend.status === 400, overspend.json)
const huge = await call("POST", "/transactions/disburse", {
  token,
  body: { bucketId: pot.id, amount: 9_999_999_999 },
})
check("out-of-range amount → 400 validation", huge.json.error?.code === "VALIDATION_ERROR", huge.json)
data = await boot()
const p = data.buckets.find((b) => b.id === pot.id)
check("pot allocated 300, spent 100", p.allocated === 300 && p.spent === 100, p)
check(
  "bank debited by the disbursement",
  data.bankAccounts.find((a) => a.isPrimary).balance === startBank - 300,
)

// --- bank ---
const acct = await ok("create bank account", "POST", "/bank/accounts", {
  token,
  body: { name: "Smoke cash" },
})
await ok("add funds", "POST", "/bank/add-funds", { token, body: { accountId: acct.id, amount: 50 } })
data = await boot()
check("account balance 50", data.bankAccounts.find((a) => a.id === acct.id)?.balance === 50)

// --- months ---
const months = await ok("months list", "GET", "/months", { token })
const ym = months[0].ym
const detail = await ok("month detail", "GET", `/months/${ym}`, { token })
check("month list and detail totals agree", detail.total === months[0].total, { months, detail })
const badYm = await call("GET", "/months/2026-13", { token })
check("invalid month → 404", badYm.status === 404)

// --- projects + milestones ---
const project = await ok("create project", "POST", "/projects", {
  token,
  body: { name: "Smoke house", targetAmount: 2000 },
})
const m1 = await ok("create milestone 1", "POST", "/milestones", {
  token,
  body: { projectId: project.id, title: "First", targetAmount: 100 },
})
const m2 = await ok("create milestone 2", "POST", "/milestones", {
  token,
  body: { projectId: project.id, title: "Second", targetAmount: 100 },
})
const locked = await call("POST", `/milestones/${m2.id}/fund`, { token, body: { amount: 10 } })
check("funding a locked milestone is refused", locked.status === 400, locked.json)
await ok("fund milestone 1 to target", "POST", `/milestones/${m1.id}/fund`, {
  token,
  body: { amount: 100 },
})
data = await boot()
const statuses = data.milestones
  .filter((m) => m.projectId === project.id)
  .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
  .map((m) => m.status)
check("milestones completed → in_progress", statuses.join() === "completed,in_progress", statuses)

// --- settings + income ---
// --- export + onboarding ---
{
  const res = await fetch(`${BASE}/api/mobile/export/transactions`, {
    headers: { authorization: `Bearer ${token}` },
  })
  const csv = await res.text()
  check(
    "export this month as CSV",
    res.status === 200 &&
      (res.headers.get("content-type") ?? "").startsWith("text/csv") &&
      csv.startsWith("date,bucket,amount,note,method") &&
      csv.includes("Smoke pot"),
    { status: res.status, head: csv.slice(0, 80) },
  )
}
check("new account not yet onboarded", (await boot()).onboardedAt === null)
await ok("mark onboarded", "POST", "/settings/onboarded", { token })
check("onboardedAt recorded", (await boot()).onboardedAt !== null)

await ok("update profile", "PATCH", "/settings/profile", { token, body: { displayName: "Smoky" } })
await ok("add income source", "POST", "/income-sources", {
  token,
  body: { name: "Smoke gig", amount: 1000 },
})
data = await boot()
check("salary resynced from income sources", data.profile.salary === 14000 + 1000, data.profile)
await ok("set app lock", "POST", "/settings/app-lock", { token, body: { pin: "4321" } })
const pinOk = await ok("verify right PIN", "POST", "/settings/app-lock/verify", {
  token,
  body: { pin: "4321" },
})
const pinBad = await ok("verify wrong PIN", "POST", "/settings/app-lock/verify", {
  token,
  body: { pin: "0000" },
})
check("PIN verification", pinOk.ok === true && pinBad.ok === false)
await ok("register push token", "POST", "/push/register-token", {
  token,
  body: { fcmToken: `smoke-${Date.now()}`, platform: "android" },
})

// --- logout, then clean up the throwaway account ---
await ok("delete account", "POST", "/settings/delete-account", {
  token,
  body: { confirmEmail: email },
})
const afterDelete = await call("POST", "/auth/refresh", {
  body: { refreshToken: refreshed.refreshToken },
})
check("sessions are gone after account deletion", afterDelete.status === 401)
// Logout needs only the refresh token; revoking an already-deleted session is a no-op.
await ok("logout", "POST", "/auth/logout", { body: { refreshToken: reg.refreshToken } })

console.log(`\nAll ${passed} checks passed against ${BASE}`)
