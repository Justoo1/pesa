import { prisma } from "@/lib/db"

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
