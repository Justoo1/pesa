import { setRoundUpsPrefsCore } from "@/app/actions/settings"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const PATCH = withMobileRoute(async (request) => {
  const userId = await requireMobileUserId(request)
  await setRoundUpsPrefsCore(userId, await request.json())
  return mobileOk({ updated: true })
})
