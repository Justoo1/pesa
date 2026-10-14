import { verifyAppPinCore } from "@/app/actions/settings"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

/** `{ pin }` → `{ ok: boolean }`; always checked server-side. */
export const POST = withMobileRoute(async (request) => {
  const userId = await requireMobileUserId(request)
  return mobileOk(await verifyAppPinCore(userId, await request.json()))
})
