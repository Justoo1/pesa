import { disableAppLockCore, setAppLockCore } from "@/app/actions/settings"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { HttpError, mobileOk, withMobileRoute } from "@/lib/mobile/response"

/** Set (or replace) the app-lock PIN: `{ pin }`. */
export const POST = withMobileRoute(async (request) => {
  const userId = await requireMobileUserId(request)
  await setAppLockCore(userId, await request.json())
  return mobileOk({ enabled: true })
})

/** Turn the app lock off; requires the current PIN: `{ pin }`. */
export const DELETE = withMobileRoute(async (request) => {
  const userId = await requireMobileUserId(request)
  const result = await disableAppLockCore(userId, await request.json())
  if (!result.ok) throw new HttpError(400, "CONFLICT", result.error)
  return mobileOk({ enabled: false })
})
