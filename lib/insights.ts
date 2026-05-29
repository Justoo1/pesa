import { prisma } from "@/lib/db"
import type { MonthRow } from "@/components/pesa/types"

const SAVED_KINDS = new Set(["future"])
const GAVE_KINDS = new Set(["give", "people"])
const LIVED_KINDS = new Set(["essential", "bills"])

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

  // Net worth = what's actually sitting in future-kind pots right now
  // (allocated less spent), not the lifetime inflow.
  const futureBuckets = await prisma.bucket.aggregate({
    where: { userId, kind: "future", archivedAt: null },
    _sum: { allocated: true, spent: true },
  })
  const netWorth =
    (futureBuckets._sum.allocated ?? 0) - (futureBuckets._sum.spent ?? 0)

  return { months, netWorth }
}
