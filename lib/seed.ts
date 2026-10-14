import { prisma } from "@/lib/db"
import { initialBuckets } from "@/components/pesa/data"

export async function seedNewUser(userId: string) {
  if ((await prisma.bucket.count({ where: { userId } })) > 0) return

  const now = new Date()
  const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" })

  // One transaction holding a per-user advisory lock, re-checking inside it:
  // a concurrent second call (double-submitted signup, web + mobile racing on
  // first sign-in) waits, then sees the pots and does nothing — instead of
  // seeding a second "Salary" (doubling payday income) or a second primary.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"seed:" + userId}))`
    if ((await tx.bucket.count({ where: { userId } })) > 0) return

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { name: true, displayName: true, email: true },
    })

    // Pick a sensible default displayName for users who came in via magic link
    // (no `name` from the OAuth provider).
    const fallbackFromEmail = user?.email ? user.email.split("@")[0] : undefined
    const displayName = user?.displayName ?? user?.name ?? fallbackFromEmail ?? "Friend"

    await tx.user.update({
      where: { id: userId },
      data: { salary: 14000, currency: "GH₵", monthLabel, displayName },
    })

    // Salary is derived from active income sources (see app/actions/income-sources.ts
    // `syncSalary`) — seed one so it doesn't get zeroed out the first time the
    // user edits their income sources.
    await tx.incomeSource.create({
      data: { userId, name: "Salary", amount: 14000, active: true, order: 0 },
    })

    // Every user needs a primary bank account — disbursements and the monthly
    // income credit always target it (see lib/bank.ts `getPrimaryAccountId`).
    if ((await tx.bankAccount.count({ where: { userId, isPrimary: true } })) === 0) {
      await tx.bankAccount.create({
        data: { userId, name: "Bank", icon: "wallet", isPrimary: true, balance: 0, order: 0 },
      })
    }

    // Seed a starter set of pots — empty, so the user starts fresh.
    await tx.bucket.createMany({
      data: initialBuckets.map((b) => ({
        userId,
        name: b.name,
        target: b.target,
        allocated: 0,
        color: b.color,
        icon: b.icon,
        priority: b.priority,
        kind: b.kind,
        carryOver: b.carryOver,
      })),
    })
  })
}
