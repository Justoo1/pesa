import { verifyAppPinCore } from "@/app/actions/settings"
import { prisma } from "@/lib/db"
import { requireMobileAuth } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

/**
 * `{ pin }` → `{ ok, error?, signedOut? }`. A correct PIN unlocks this
 * session server-side; wrong ones count toward the lockout (lib/app-lock.ts).
 */
export const POST = withMobileRoute(async (request) => {
  const { userId, sessionId } = await requireMobileAuth(request, { allowLocked: true })
  const result = await verifyAppPinCore(userId, await request.json())
  if (result.ok) {
    await prisma.mobileSession.update({ where: { id: sessionId }, data: { unlockedAt: new Date() } })
  }
  return mobileOk(result)
})
