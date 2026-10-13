import { applyPaydayTemplateCore } from "@/app/actions/transactions"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const POST = withMobileRoute(async (request) => {
  const userId = await requireMobileUserId(request)
  const body = await request.json()
  const result = await applyPaydayTemplateCore(userId, body)
  return mobileOk(result)
})
