import { prisma } from "@/lib/db"
import { initialBuckets } from "@/components/pesa/data"

export async function seedNewUser(userId: string) {
  const existing = await prisma.bucket.count({ where: { userId } })
  if (existing > 0) return

  const now = new Date()
  const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, displayName: true, email: true },
  })

  // Pick a sensible default displayName for users who came in via magic link
  // (no `name` from the OAuth provider).
  const fallbackFromEmail = user?.email ? user.email.split("@")[0] : undefined
  const displayName = user?.displayName ?? user?.name ?? fallbackFromEmail ?? "Friend"

  await prisma.user.update({
    where: { id: userId },
    data: {
      salary: 14000,
      currency: "GH₵",
      monthLabel,
      displayName,
    },
  })

  // Seed a starter set of pots — empty, so the user starts fresh.
  await prisma.bucket.createMany({
    data: initialBuckets.map((b) => ({
      userId,
      name: b.name,
      target: b.target,
      allocated: 0,
      color: b.color,
      icon: b.icon,
      priority: b.priority,
      kind: b.kind,
    })),
  })
}
