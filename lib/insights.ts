import { prisma } from "@/lib/db"
import type { MonthRow } from "@/components/pesa/types"

// Paying down debt is economically equivalent to saving for this app's
// simplified net-worth model, so "debt" counts alongside future/emergency.
export const SAVED_KINDS = new Set(["future", "emergency", "debt"])
export const GAVE_KINDS = new Set(["give", "people"])
export const LIVED_KINDS = new Set(["essential", "bills"])
const PROJECTABLE_KINDS = ["future", "emergency", "debt"]

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

export type AllTimeMonth = {
  ym: string // "YYYY-MM"
  label: string // "May 2026"
  saved: number
  gave: number
  lived: number
  total: number
}

/**
 * Load every month with any activity (or current month even if empty).
 * Ordered newest-first.
 */
export async function loadAllMonths(userId: string): Promise<AllTimeMonth[]> {
  // Spends (negative amount, no transferId) consume from a pot but don't
  // re-shape the allocation picture, so they're excluded. Transfer halves
  // (signed, has transferId) stay in — they genuinely redirect money between
  // kinds.
  const txns = await prisma.transaction.findMany({
    where: {
      userId,
      OR: [{ transferId: { not: null } }, { amount: { gt: 0 } }],
    },
    select: { amount: true, occurredAt: true, bucket: { select: { kind: true } } },
  })

  const byYm = new Map<string, AllTimeMonth>()
  const ensure = (d: Date) => {
    const y = d.getFullYear()
    const m = d.getMonth()
    const ym = `${y}-${String(m + 1).padStart(2, "0")}`
    if (!byYm.has(ym)) {
      const label = new Date(y, m, 1).toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      })
      byYm.set(ym, { ym, label, saved: 0, gave: 0, lived: 0, total: 0 })
    }
    return byYm.get(ym)!
  }

  // Always surface the current month so users see a row even with zero txns.
  ensure(new Date())

  for (const t of txns) {
    const row = ensure(t.occurredAt)
    if (SAVED_KINDS.has(t.bucket.kind)) row.saved += t.amount
    else if (GAVE_KINDS.has(t.bucket.kind)) row.gave += t.amount
    else if (LIVED_KINDS.has(t.bucket.kind)) row.lived += t.amount
    row.total += t.amount
  }

  return Array.from(byYm.values()).sort((a, b) => b.ym.localeCompare(a.ym))
}

export async function loadInsights(
  userId: string,
): Promise<{ months: MonthRow[]; netWorth: number }> {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const txns = await prisma.transaction.findMany({
    where: {
      userId,
      occurredAt: { gte: start },
      OR: [{ transferId: { not: null } }, { amount: { gt: 0 } }],
    },
    select: { amount: true, occurredAt: true, bucket: { select: { kind: true } } },
  })

  const months: MonthRow[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      month: MONTH_LABELS[d.getMonth()],
      saved: 0,
      gave: 0,
      lived: 0,
      total: 0,
    })
  }

  for (const t of txns) {
    const idx =
      5 -
      (now.getFullYear() * 12 +
        now.getMonth() -
        (t.occurredAt.getFullYear() * 12 + t.occurredAt.getMonth()))
    if (idx < 0 || idx > 5) continue
    const row = months[idx]
    if (SAVED_KINDS.has(t.bucket.kind)) row.saved += t.amount
    else if (GAVE_KINDS.has(t.bucket.kind)) row.gave += t.amount
    else if (LIVED_KINDS.has(t.bucket.kind)) row.lived += t.amount
    row.total += t.amount
  }

  // Net worth = all-time balance of every active future/emergency pot (every
  // signed txn ever attached to one, mirroring each pot's own
  // `projection.lifetimeBalance`) — NOT `allocated - spent`, which is only a
  // live tally that `ensureCurrentMonth` zeroes every calendar month.
  const netWorthAgg = await prisma.transaction.aggregate({
    where: { userId, bucket: { kind: { in: PROJECTABLE_KINDS }, archivedAt: null } },
    _sum: { amount: true },
  })
  const netWorth = netWorthAgg._sum.amount ?? 0

  return { months, netWorth }
}

export type PotProjection = {
  /** monthly average inflow over the last 3 *complete* calendar months */
  avgPerMonth: number
  /** sum of every signed txn ever attached to this bucket */
  lifetimeBalance: number
  /** whole months from today until lifetimeBalance reaches target; null if not derivable */
  monthsToGoal: number | null
  /** ISO date (1st of the ETA month); null when avgPerMonth ≤ 0 and goal not yet reached */
  etaIso: string | null
  goalReached: boolean
}

/**
 * Forward-looking projection for every active pot, based on the user's
 * actual 3-month cadence. `avgPerMonth`/`lifetimeBalance` are computed for
 * every kind (used by target-suggestion nudges on any pot); `monthsToGoal`/
 * `etaIso`/`goalReached` only make sense for pots that accumulate toward a
 * fixed target (future/emergency/debt) and stay null/false otherwise. Pure
 * read-side — no schema touched. Returned as Record<bucketId, PotProjection>.
 */
export async function loadPotProjections(
  userId: string,
): Promise<Record<string, PotProjection>> {
  const buckets = await prisma.bucket.findMany({
    where: { userId, archivedAt: null },
    select: { id: true, target: true, kind: true },
  })
  if (buckets.length === 0) return {}

  const bucketIds = buckets.map((b) => b.id)
  const now = new Date()
  const threeStart = new Date(now.getFullYear(), now.getMonth() - 3, 1)
  const thisStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [lifetimeRows, recentRows] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["bucketId"],
      where: { userId, bucketId: { in: bucketIds } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["bucketId"],
      where: {
        userId,
        bucketId: { in: bucketIds },
        occurredAt: { gte: threeStart, lt: thisStart },
      },
      _sum: { amount: true },
    }),
  ])
  const lifetimeMap = new Map(lifetimeRows.map((r) => [r.bucketId, r._sum.amount ?? 0]))
  const recentMap = new Map(recentRows.map((r) => [r.bucketId, r._sum.amount ?? 0]))

  const out: Record<string, PotProjection> = {}
  for (const b of buckets) {
    const lifetimeBalance = lifetimeMap.get(b.id) ?? 0
    const avgPerMonth = Math.max(0, Math.round((recentMap.get(b.id) ?? 0) / 3))
    const projectable = PROJECTABLE_KINDS.includes(b.kind)
    const goalReached = projectable && b.target > 0 && lifetimeBalance >= b.target
    let monthsToGoal: number | null = null
    let etaIso: string | null = null
    if (projectable && !goalReached && b.target > 0 && avgPerMonth > 0) {
      const remaining = b.target - lifetimeBalance
      monthsToGoal = Math.max(1, Math.ceil(remaining / avgPerMonth))
      const eta = new Date(now.getFullYear(), now.getMonth() + monthsToGoal, 1)
      etaIso = eta.toISOString()
    }
    out[b.id] = { avgPerMonth, lifetimeBalance, monthsToGoal, etaIso, goalReached }
  }
  return out
}

/**
 * Twelve months of the requested calendar year, oldest-first. Used by the
 * annual wrap card on wrap.tsx. Months in the future relative to today are
 * still returned so the chart bars line up — they'll just be zeroed.
 */
export async function loadAnnualMonths(
  userId: string,
  year: number,
): Promise<MonthRow[]> {
  const start = new Date(year, 0, 1)
  const end = new Date(year + 1, 0, 1)
  const txns = await prisma.transaction.findMany({
    where: {
      userId,
      occurredAt: { gte: start, lt: end },
      OR: [{ transferId: { not: null } }, { amount: { gt: 0 } }],
    },
    select: { amount: true, occurredAt: true, bucket: { select: { kind: true } } },
  })
  const months: MonthRow[] = MONTH_LABELS.map((label) => ({
    month: label,
    saved: 0,
    gave: 0,
    lived: 0,
    total: 0,
  }))
  for (const t of txns) {
    const idx = t.occurredAt.getMonth()
    const row = months[idx]
    if (SAVED_KINDS.has(t.bucket.kind)) row.saved += t.amount
    else if (GAVE_KINDS.has(t.bucket.kind)) row.gave += t.amount
    else if (LIVED_KINDS.has(t.bucket.kind)) row.lived += t.amount
    row.total += t.amount
  }
  return months
}

/**
 * How many *prior* complete months in a row every active pot reached its
 * target. Uses the pot's *current* target as the bar — historical targets
 * aren't snapshotted in the schema, so this is approximate when targets have
 * been adjusted recently. Pots created after a candidate month are skipped
 * for that month so a new pot doesn't break a streak retroactively.
 */
export async function loadFilledStreak(userId: string): Promise<number> {
  const buckets = await prisma.bucket.findMany({
    where: { userId, archivedAt: null, target: { gt: 0 } },
    select: { id: true, target: true, createdAt: true },
  })
  if (buckets.length === 0) return 0

  const now = new Date()
  // Look back at most 24 months — a longer streak than that is unlikely and
  // the loop bails as soon as a month doesn't qualify anyway.
  const earliest = new Date(now.getFullYear(), now.getMonth() - 24, 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth(), 1) // exclusive — skips current month

  const txns = await prisma.transaction.findMany({
    where: {
      userId,
      occurredAt: { gte: earliest, lt: monthEnd },
      amount: { gt: 0 },
      transferId: null,
    },
    select: { bucketId: true, amount: true, occurredAt: true },
  })

  // Bucket inflow by [bucketId][YYYY-MM].
  const byBucketMonth = new Map<string, Map<string, number>>()
  for (const t of txns) {
    const ym = `${t.occurredAt.getFullYear()}-${String(t.occurredAt.getMonth() + 1).padStart(2, "0")}`
    let inner = byBucketMonth.get(t.bucketId)
    if (!inner) {
      inner = new Map()
      byBucketMonth.set(t.bucketId, inner)
    }
    inner.set(ym, (inner.get(ym) ?? 0) + t.amount)
  }

  let streak = 0
  for (let i = 1; i <= 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const monthStart = d
    const eligible = buckets.filter((b) => b.createdAt <= monthStart)
    if (eligible.length === 0) break
    const allFilled = eligible.every((b) => {
      const allocated = byBucketMonth.get(b.id)?.get(ym) ?? 0
      return allocated >= b.target
    })
    if (!allFilled) break
    streak += 1
  }
  return streak
}

/**
 * Average monthly outflow on essentials + bills over the past 3 complete
 * months. The denominator for the emergency cushion meter. Returns 0 if
 * there's no historical data so the caller can branch on it.
 */
export async function loadAvgEssentialsPerMonth(userId: string): Promise<number> {
  const now = new Date()
  const threeStart = new Date(now.getFullYear(), now.getMonth() - 3, 1)
  const thisStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const txns = await prisma.transaction.findMany({
    where: {
      userId,
      occurredAt: { gte: threeStart, lt: thisStart },
      amount: { gt: 0 },
      transferId: null,
      bucket: { kind: { in: ["essential", "bills"] } },
    },
    select: { amount: true },
  })
  const total = txns.reduce((s, t) => s + t.amount, 0)
  return Math.max(0, Math.round(total / 3))
}

export type MonthDetail = {
  ym: string
  label: string // "May 2026"
  isPastMonth: boolean
  saved: number
  gave: number
  lived: number
  total: number
  transactions: {
    id: string
    amount: number
    note: string
    method: string
    occurredAt: string
    bucket: { name: string; icon: string; color: string; kind: string }
  }[]
}

/**
 * Every pot transaction in one calendar month (newest first) plus its
 * saved/gave/lived totals. Shared by the web `/months/[ym]` page and the
 * mobile `GET /api/mobile/months/:ym` route. Returns null for a malformed ym.
 */
export async function loadMonthDetail(userId: string, ym: string): Promise<MonthDetail | null> {
  if (!/^\d{4}-\d{2}$/.test(ym)) return null
  const [year, month] = ym.split("-").map(Number)
  if (month < 1 || month > 12) return null
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)
  const label = start.toLocaleString("en-US", { month: "long", year: "numeric" })

  const txns = await prisma.transaction.findMany({
    where: { userId, occurredAt: { gte: start, lt: end } },
    orderBy: { occurredAt: "desc" },
    include: {
      bucket: { select: { name: true, icon: true, color: true, kind: true } },
    },
  })

  const now = new Date()
  const isPastMonth =
    year < now.getFullYear() || (year === now.getFullYear() && month - 1 < now.getMonth())

  let saved = 0
  let gave = 0
  let lived = 0
  for (const t of txns) {
    if (SAVED_KINDS.has(t.bucket.kind)) saved += t.amount
    else if (GAVE_KINDS.has(t.bucket.kind)) gave += t.amount
    else if (LIVED_KINDS.has(t.bucket.kind)) lived += t.amount
  }

  return {
    ym,
    label,
    isPastMonth,
    saved,
    gave,
    lived,
    total: saved + gave + lived,
    transactions: txns.map((t) => ({
      id: t.id,
      amount: t.amount,
      note: t.note,
      method: t.method,
      occurredAt: t.occurredAt.toISOString(),
      bucket: t.bucket,
    })),
  }
}
