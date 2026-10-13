import { ensureCurrentMonth } from "@/lib/month"
import { loadHomeData } from "@/lib/mobile/bootstrap"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const GET = withMobileRoute(async (request) => {
  const userId = await requireMobileUserId(request)
  await ensureCurrentMonth(userId)
  const data = await loadHomeData(userId)
  return mobileOk(data)
})
