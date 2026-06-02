import { prisma } from "@/lib/db"

function ymOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function longLabel(d: Date): string {
  return d.toLocaleString("en-US", { month: "long", year: "numeric" })
}

/**
 * Roll the live disbursement state over to the current calendar month.
 *
 * The home screen's "left to disburse", every pot's `allocated`, and the
 * "month so far" wrap are a live tally for the *current* month — each payday
 * you refill your pots from scratch. We stamp the month that tally belongs to
 * in `User.activeMonth`; when the calendar advances past it we zero
 * `allocated`/`spent` for a fresh month and relabel `monthLabel`.
 *
 * Transactions are deliberately *kept* (the history/insights pages read them
 * by `occurredAt`) — unlike the manual "reset month" which wipes the ledger.
 *
 * Safe to call on every home-page load: it's a no-op once stamped for the
 * month and never resets within the same month.
 */
export async function ensureCurrentMonth(userId: string): Promise<void> {
  const now = new Date()
  const currentYm = ymOf(now)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeMonth: true },
  })
  if (!user || user.activeMonth === currentYm) return

  // First run after this feature shipped: no stamp yet. Infer which month the
  // existing live tally belongs to from the most recent transaction so we don't
  // wipe a legitimately in-progress current month.
  let priorYm = user.activeMonth
  if (priorYm === null) {
    const latest = await prisma.transaction.findFirst({
      where: { userId },
      orderBy: { occurredAt: "desc" },
      select: { occurredAt: true },
    })
    priorYm = latest ? ymOf(latest.occurredAt) : currentYm
  }

  if (priorYm === currentYm) {
    // Live tally already belongs to this month — just stamp + relabel.
    await prisma.user.update({
      where: { id: userId },
      data: { activeMonth: currentYm, monthLabel: longLabel(now) },
    })
    return
  }

  // New calendar month: start fresh. Zero the live tally and relabel; keep the
  // ledger so the prior month still shows up under history/insights.
  await prisma.$transaction([
    prisma.bucket.updateMany({
      where: { userId },
      data: { allocated: 0, spent: 0 },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { activeMonth: currentYm, monthLabel: longLabel(now) },
    }),
  ])
}
