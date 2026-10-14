import { prisma } from "@/lib/db"
import { requireMobileAuth } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

/** Re-lock this session (the app calls it when it goes to the background). */
export const POST = withMobileRoute(async (request) => {
  const { sessionId } = await requireMobileAuth(request, { allowLocked: true })
  await prisma.mobileSession.update({ where: { id: sessionId }, data: { unlockedAt: null } })
  return mobileOk({ locked: true })
})
