import { prisma } from "@/lib/db"

export type PaydayDraft = {
  bucketId: string
  bucketName: string
  amount: number
  color: string
  icon: string
  kind: string
  /** allocated already this calendar month — purely informational for the UI */
  alreadyThisMonth: number
}

export type ApplyDraft = {
  bucketId: string
  amount: number
  note?: string
  method?: string
}

/**
 * Apply a payday template for the given user, with no session check. Used by
 * the auth'd server action *and* by the payday cron when auto-payday is on.
 *
 * Each draft creates a positive-amount Transaction and bumps the matching
 * bucket's allocated. Round-ups are intentionally skipped — the template
 * values are last-month's actual disbursements (rounding baked in).
 */
export async function applyPaydayTemplateForUser(
  userId: string,
  drafts: ApplyDraft[],
) {
  if (drafts.length === 0) return { applied: 0 }
  const buckets = await prisma.bucket.findMany({
    where: {
      userId,
      archivedAt: null,
      id: { in: drafts.map((d) => d.bucketId) },
    },
    select: { id: true },
  })
  const known = new Set(buckets.map((b) => b.id))
  const valid = drafts.filter((d) => known.has(d.bucketId) && d.amount > 0)
  if (valid.length === 0) return { applied: 0 }

  await prisma.$transaction(
    valid.flatMap((d) => [
      prisma.transaction.create({
        data: {
          userId,
          bucketId: d.bucketId,
          amount: d.amount,
          note: d.note?.trim() || "Payday replay",
          method: d.method || "MoMo",
        },
      }),
      prisma.bucket.update({
        where: { id: d.bucketId },
        data: { allocated: { increment: d.amount } },
      }),
    ]),
  )
  return { applied: valid.length }
}

/**
 * Build a per-pot disbursement template based on what the user actually
 * disbursed during the prior calendar month. Excludes transfer halves and any
 * spend rows so the template represents intent (top-ups), not consumption.
 *
 * Archived pots and pots that didn't receive anything last month are dropped.
 */
export async function loadPaydayTemplate(userId: string): Promise<PaydayDraft[]> {
  const now = new Date()
  const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastEnd = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [grouped, thisMonth, buckets] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["bucketId"],
      where: {
        userId,
        occurredAt: { gte: lastStart, lt: lastEnd },
        amount: { gt: 0 },
        transferId: null,
      },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["bucketId"],
      where: {
        userId,
        occurredAt: { gte: thisStart },
        amount: { gt: 0 },
        transferId: null,
      },
      _sum: { amount: true },
    }),
    prisma.bucket.findMany({
      where: { userId, archivedAt: null },
      select: { id: true, name: true, color: true, icon: true, kind: true, priority: true },
      orderBy: { priority: "asc" },
    }),
  ])

  const lastByBucket = new Map(
    grouped.map((g) => [g.bucketId, g._sum.amount ?? 0]),
  )
  const thisByBucket = new Map(
    thisMonth.map((g) => [g.bucketId, g._sum.amount ?? 0]),
  )

  return buckets
    .map((b) => ({
      bucketId: b.id,
      bucketName: b.name,
      amount: lastByBucket.get(b.id) ?? 0,
      color: b.color,
      icon: b.icon,
      kind: b.kind,
      alreadyThisMonth: thisByBucket.get(b.id) ?? 0,
    }))
    .filter((d) => d.amount > 0)
}
