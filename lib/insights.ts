import { prisma } from "@/lib/db"
import type { MonthRow } from "@/components/pesa/types"

const SAVED_KINDS = new Set(["future", "emergency"])
const GAVE_KINDS = new Set(["give", "people"])
const LIVED_KINDS = new Set(["essential", "bills"])
const PROJECTABLE_KINDS = ["future", "emergency"]

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

  // Net worth = what's actually sitting in future/emergency pots right now
  // (allocated less spent), not the lifetime inflow.
  const futureBuckets = await prisma.bucket.aggregate({
    where: { userId, kind: { in: PROJECTABLE_KINDS }, archivedAt: null },
    _sum: { allocated: true, spent: true },
  })
  const netWorth =
    (futureBuckets._sum.allocated ?? 0) - (futureBuckets._sum.spent ?? 0)

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
 * For every savings-style pot (future / emergency) return a forward-looking
 * projection based on the user's actual cadence. Pure read-side — no schema
 * touched. Returned as Record<bucketId, PotProjection>.
 */
export async function loadPotProjections(
  userId: string,
): Promise<Record<string, PotProjection>> {
  const buckets = await prisma.bucket.findMany({
    where: { userId, archivedAt: null, kind: { in: PROJECTABLE_KINDS } },
    select: { id: true, target: true },
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
    const goalReached = b.target > 0 && lifetimeBalance >= b.target
    let monthsToGoal: number | null = null
    let etaIso: string | null = null
    if (!goalReached && b.target > 0 && avgPerMonth > 0) {
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
