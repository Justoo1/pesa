import { disableAppLockCore, setAppLockCore } from "@/app/actions/settings"
import { prisma } from "@/lib/db"
import { requireMobileAuth } from "@/lib/mobile/auth"
import { HttpError, mobileOk, withMobileRoute } from "@/lib/mobile/response"

/**
 * Set or change the app-lock PIN: `{ pin, currentPin? }` (`currentPin` is
 * required when a PIN already exists). This session stays unlocked.
 */
export const POST = withMobileRoute(async (request) => {
  const { userId, sessionId } = await requireMobileAuth(request)
  await setAppLockCore(userId, await request.json())
  await prisma.mobileSession.update({ where: { id: sessionId }, data: { unlockedAt: new Date() } })
  return mobileOk({ enabled: true })
})

/** Turn the app lock off; requires the current PIN: `{ pin }`. */
export const DELETE = withMobileRoute(async (request) => {
  const userId = (await requireMobileAuth(request)).userId
  const result = await disableAppLockCore(userId, await request.json())
  if (!result.ok) throw new HttpError(400, "CONFLICT", result.error)
  return mobileOk({ enabled: false })
})
