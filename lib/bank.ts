import { prisma } from "@/lib/db"

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
  const created = await prisma.bankAccount.create({
    data: { userId, name: "Bank", icon: "wallet", isPrimary: true, balance: 0, order: 0 },
  })
  return created.id
}

/**
 * Sum of personal (not-tied-to-a-pot) spends logged this calendar month, used
 * to deduct from the "Spendable" allowance on the Bank page. Scoped to the
 * current month the same way pot `allocated`/`spent` tallies are, so it
 * resets naturally each payday rather than accumulating forever.
 */
export async function loadMonthlyBankSpend(userId: string): Promise<number> {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const result = await prisma.bankTransaction.aggregate({
    where: { userId, kind: "spend", occurredAt: { gte: start } },
    _sum: { amount: true },
  })
  return Math.abs(result._sum.amount ?? 0)
}
