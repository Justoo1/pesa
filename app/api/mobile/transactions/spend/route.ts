import { spendCore } from "@/app/actions/transactions"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const POST = withMobileRoute(async (request) => {
  const userId = await requireMobileUserId(request)
  const body = await request.json()
  await spendCore(userId, body)
  return mobileOk({ spent: true })
})
