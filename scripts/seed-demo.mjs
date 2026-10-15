// Creates (or tops up) a demo account with a realistic month of activity
// plus three months of history — for store screenshots and for the store
// reviewer account. Goes through the public mobile API only, so it works
// against local dev or production alike.
//
//   DEMO_EMAIL=you@example.com DEMO_PASSWORD='…' node scripts/seed-demo.mjs
//   BASE_URL=https://pesa.edtmsys.com DEMO_EMAIL=… DEMO_PASSWORD=… node scripts/seed-demo.mjs
//
// Run it once per account: this month's amounts are capped by each pot's
// target, so re-running mostly gets "already full" refusals (harmless).
const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "")
const email = process.env.DEMO_EMAIL
const password = process.env.DEMO_PASSWORD
const name = process.env.DEMO_NAME ?? "Ama Mensah"
if (!email || !password) {
  console.error("Set DEMO_EMAIL and DEMO_PASSWORD (≥8 chars).")
  process.exit(1)
}

async function call(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}/api/mobile${path}`, {
    method,
    headers: {
      ...(body !== undefined && { "content-type": "application/json" }),
      ...(token && { authorization: `Bearer ${token}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  // Every route answers { ok, data } or { ok: false, error }.
  return { status: res.status, json: json.ok ? json.data : json }
}

async function must(label, method, path, opts) {
  const r = await call(method, path, opts)
  if (r.status >= 300) console.warn(`  ! ${label}: ${r.status} ${JSON.stringify(r.json)}`)
  else console.log(`  ✓ ${label}`)
  return r.json
}

// --- sign in (register on first run) ---
let auth = await call("POST", "/auth/register", { body: { name, email, password } })
if (auth.status === 409) auth = await call("POST", "/auth/login", { body: { email, password } })
if (auth.status >= 300) {
  console.error("Couldn't sign in:", auth.status, auth.json)
  process.exit(1)
}
const token = auth.json.accessToken
console.log(`Signed in as ${email} on ${BASE}`)

await must("display name", "PATCH", "/settings/profile", { token, body: { displayName: name.split(" ")[0] } })

const boot = () => call("GET", "/bootstrap", { token }).then((r) => r.json)
let data = await boot()
const pot = (n) => data.buckets.find((b) => b.name === n)
const bank = data.bankAccounts.find((a) => a.isPrimary)

// Salary lands in the bank (the payday credit); top up so sends don't overdraw.
if (bank && bank.balance < 14000) {
  await must("salary into bank", "POST", "/bank/add-funds", {
    token,
    body: { accountId: bank.id, amount: 14000 - bank.balance, note: "Salary" },
  })
}

// --- this month: most pots partly or fully funded, a few spends ---
const sends = [
  ["Rent", 3500, "Transfer"],
  ["Savings", 1500, "MoMo"],
  ["Mom", 1200, "MoMo"],
  ["Tithe", 1400, "Cash"],
  ["SIP", 800, "Transfer"],
  ["Emergency", 400, "MoMo"],
  ["House keep", 600, "MoMo"],
  ["Internet", 280, "Card"],
]
for (const [n, amount, method] of sends) {
  const b = pot(n)
  if (b) await must(`send ${amount} to ${n}`, "POST", "/transactions/disburse", { token, body: { bucketId: b.id, amount, method } })
}
for (const [n, amount, note] of [
  ["House keep", 240, "Market run"],
  ["House keep", 85, "Cleaning supplies"],
]) {
  const b = pot(n)
  if (b) await must(`spend ${amount} from ${n}`, "POST", "/transactions/spend", { token, body: { bucketId: b.id, amount, note } })
}

// --- history: three past months, so Insights and Wrap have a story ---
const now = new Date()
for (let back = 3; back >= 1; back--) {
  const occurredAt = new Date(Date.UTC(now.getFullYear(), now.getMonth() - back, 26, 12))
  const wobble = back * 50
  const entries = [
    ["Rent", 3500],
    ["Savings", 2000 - wobble],
    ["Mom", 1200],
    ["Tithe", 1400],
    ["SIP", 1500 - wobble * 2],
    ["Emergency", 800],
    ["House keep", 900 - wobble],
    ["Internet", 280],
    ["Gas", 220],
    ["Light bill", 400 - wobble],
  ]
    .map(([n, amount]) => ({ bucketId: pot(n)?.id, amount }))
    .filter((e) => e.bucketId)
  await must(`history ${occurredAt.toISOString().slice(0, 7)}`, "POST", "/transactions/disburse-many", {
    token,
    body: { entries, occurredAt: occurredAt.toISOString(), method: "MoMo", note: "Payday" },
  })
}

// --- a project with milestones ---
data = await boot()
if (!data.projects.some((p) => p.name === "Our first home")) {
  const project = await must("project", "POST", "/projects", {
    token,
    body: { name: "Our first home", targetAmount: 60000 },
  })
  if (project?.id) {
    const m1 = await must("milestone 1", "POST", "/milestones", {
      token,
      body: { projectId: project.id, title: "Land deposit", targetAmount: 1000 },
    })
    await must("milestone 2", "POST", "/milestones", {
      token,
      body: { projectId: project.id, title: "Building permit", targetAmount: 1500 },
    })
    if (m1?.id) await must("fund milestone 1", "POST", `/milestones/${m1.id}/fund`, { token, body: { amount: 1000 } })
  }
}

await call("POST", "/auth/logout", { body: { refreshToken: auth.json.refreshToken } })
console.log("Done.")
