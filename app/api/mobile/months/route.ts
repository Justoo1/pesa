import { loadAllMonths } from "@/lib/insights"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const GET = withMobileRoute(async (request) => {
  const userId = await requireMobileUserId(request)
  return mobileOk(await loadAllMonths(userId))
})
