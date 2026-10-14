import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { effectivePayday } from "@/lib/dates"

/**
 * The account that disbursements and the monthly income credit always debit/
 * credit (see prisma/schema.prisma `BankAccount.isPrimary`). Every user gets
 * one at signup (`lib/seed.ts`); this is a safety net for any account that
 * somehow doesn't have one yet, rather than throwing.
 */
export async function getPrimaryAccountId(userId: string): Promise<string> {
  const primary = await prisma.bankAccount.findFirst({
    where: { userId, isPrimary: true },
    select: { id: true },
  })
  if (primary) return primary.id
  try {
    const created = await prisma.bankAccount.create({
      data: { userId, name: "Bank", icon: "wallet", isPrimary: true, balance: 0, order: 0 },
    })
    return created.id
  } catch (e) {
    // A concurrent call created it first: the partial unique index
    // "BankAccount_one_primary_per_user" rejects a second primary.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const existing = await prisma.bankAccount.findFirstOrThrow({
        where: { userId, isPrimary: true, archivedAt: null },
        select: { id: true },
      })
      return existing.id
    }
    throw e
  }
}

/**
 * Sum of personal (not-tied-to-a-pot) spends logged since the current pay
 * cycle started, used to deduct from the "Spendable" allowance on the Bank
 * page. Scoped to the pay cycle (payday-to-payday, same as
 * `ensurePaydayCredited` in lib/month.ts) rather than the calendar month —
 * pots reset on the 1st, but the bank's spendable allowance shouldn't reset
 * until the *real* payday, so it stays anchored to last cycle's figure until
 * `paydayDayOfMonth` arrives (falls back to the 1st if unset).
 */
export async function loadMonthlyBankSpend(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { paydayDayOfMonth: true },
  })
  const now = new Date()
  const payDay = user?.paydayDayOfMonth ?? 1
  // Paydays of 29–31 land on the last day of shorter months (never the 1st–3rd
  // of the next one, which would put the cycle start in the future).
  const thisMonthPayday = effectivePayday(payDay, now.getFullYear(), now.getMonth())
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const start =
    now.getDate() >= thisMonthPayday
      ? new Date(now.getFullYear(), now.getMonth(), thisMonthPayday)
      : new Date(prev.getFullYear(), prev.getMonth(), effectivePayday(payDay, prev.getFullYear(), prev.getMonth()))
  const result = await prisma.bankTransaction.aggregate({
    where: { userId, kind: "spend", occurredAt: { gte: start } },
    _sum: { amount: true },
  })
  return Math.abs(result._sum.amount ?? 0)
}
