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

export async function loadInsights(
  userId: string,
): Promise<{ months: MonthRow[]; netWorth: number }> {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const txns = await prisma.transaction.findMany({
    where: { userId, occurredAt: { gte: start } },
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

  const allFuture = await prisma.transaction.aggregate({
    where: { userId, bucket: { kind: "future" } },
    _sum: { amount: true },
  })
  const netWorth = allFuture._sum.amount ?? 0

  return { months, netWorth }
}
