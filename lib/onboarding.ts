import { prisma } from "@/lib/db"

/**
 * The welcome walkthrough has been seen (web slides or mobile welcome).
 * Lives outside app/actions so it isn't registered as a server action:
 * it trusts the userId it's given.
 */
export async function markOnboardedCore(userId: string) {
  await prisma.user.updateMany({
    where: { id: userId, onboardedAt: null },
    data: { onboardedAt: new Date() },
  })
}
