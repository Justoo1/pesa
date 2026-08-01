import { prisma } from "@/lib/db"
import { getPrimaryAccountId } from "@/lib/bank"

function ymOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

/**
 * How much has been disbursed into each pot, per calendar month. Returns a
 * nested map: { "YYYY-MM": { bucketId: filledAmount } } summing only positive
 * inflows (top-ups + transfers in). Used by the "add to a past month" sheet to
 * disable pots that already hit their target for the month being edited.
 */
export async function loadFilledByMonth(
  userId: string,
): Promise<Record<string, Record<string, number>>> {
  const txns = await prisma.transaction.findMany({
    where: { userId, amount: { gt: 0 } },
    select: { bucketId: true, amount: true, occurredAt: true },
  })
  const out: Record<string, Record<string, number>> = {}
  for (const t of txns) {
    const ym = ymOf(t.occurredAt)
    const inner = (out[ym] ??= {})
    inner[t.bucketId] = (inner[t.bucketId] ?? 0) + t.amount
  }
  return out
}

function longLabel(d: Date): string {
  return d.toLocaleString("en-US", { month: "long", year: "numeric" })
}

function parseYm(ym: string): Date {
  const [y, m] = ym.split("-").map(Number)
  return new Date(y, m - 1, 1)
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
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
 * month and never resets within the same month. Bank crediting is a
 * *separate* concern — see `ensurePaydayCredited` below — since pots reset on
 * the 1st but the bank should only get credited on payday.
 */
export async function ensureCurrentMonth(userId: string): Promise<void> {
  await ensurePaydayCredited(userId)

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
  const carryOverBuckets = await prisma.bucket.findMany({
    where: { userId, carryOver: true },
    select: { id: true, allocated: true, spent: true },
  })

  await prisma.$transaction([
    prisma.bucket.updateMany({
      where: { userId, carryOver: false },
      data: { allocated: 0, spent: 0 },
    }),
    ...carryOverBuckets.map((b) =>
      prisma.bucket.update({
        where: { id: b.id },
        data: { allocated: Math.max(0, b.allocated - b.spent), spent: 0 },
      }),
    ),
    prisma.user.update({
      where: { id: userId },
      data: { activeMonth: currentYm, monthLabel: longLabel(now) },
    }),
  ])
}

/**
 * Credit the bank's primary account with active income sources on payday —
 * `User.paydayDayOfMonth` (falls back to the 1st of the month if unset, so
 * users who never set a payday keep the old behavior). Stamped in
 * `lastPayCreditYm`, independent of `activeMonth`/the pot reset above, so
 * pots can reset on the 1st while the bank waits for the real payday.
 *
 * Walks forward from the last credited month (capped at 24 cycles) so a
 * dormant account that skipped a payday entirely still catches up, instead
 * of silently losing that month's income.
 */
export async function ensurePaydayCredited(userId: string): Promise<void> {
  const now = new Date()
  const currentYm = ymOf(now)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { paydayDayOfMonth: true, lastPayCreditYm: true },
  })
  if (!user) return
  if (user.lastPayCreditYm === currentYm) return

  const payDay = user.paydayDayOfMonth ?? 1
  let cursor = user.lastPayCreditYm
    ? addMonths(parseYm(user.lastPayCreditYm), 1)
    : new Date(now.getFullYear(), now.getMonth(), 1)

  const cycles: string[] = []
  for (let i = 0; i < 24 && ymOf(cursor) <= currentYm; i++) {
    const cursorYm = ymOf(cursor)
    if (cursorYm === currentYm && now.getDate() < payDay) break // this month's payday hasn't arrived yet
    cycles.push(cursorYm)
    cursor = addMonths(cursor, 1)
  }
  if (cycles.length === 0) return
  const lastYm = cycles[cycles.length - 1]

  const activeIncome = await prisma.incomeSource.findMany({
    where: { userId, active: true },
    select: { amount: true },
  })
  const incomePerCycle = activeIncome.reduce((s, a) => s + a.amount, 0)

  if (incomePerCycle <= 0) {
    await prisma.user.update({ where: { id: userId }, data: { lastPayCreditYm: lastYm } })
    return
  }

  const totalIncome = incomePerCycle * cycles.length
  const primaryAccountId = await getPrimaryAccountId(userId)
  await prisma.$transaction([
    prisma.bankAccount.update({
      where: { id: primaryAccountId },
      data: { balance: { increment: totalIncome } },
    }),
    prisma.bankTransaction.create({
      data: {
        userId,
        accountId: primaryAccountId,
        amount: totalIncome,
        kind: "income",
        note: cycles.length > 1 ? `Payday credit ×${cycles.length}` : "Payday credit",
      },
    }),
    prisma.user.update({ where: { id: userId }, data: { lastPayCreditYm: lastYm } }),
  ])
}
