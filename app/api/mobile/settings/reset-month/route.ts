import { resetMonthCore } from "@/app/actions/settings"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const POST = withMobileRoute(async (request) => {
  const userId = await requireMobileUserId(request)
  await resetMonthCore(userId)
  return mobileOk({ reset: true })
})
