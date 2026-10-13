import { addFundsToBankCore } from "@/app/actions/bank"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const POST = withMobileRoute(async (request) => {
  const userId = await requireMobileUserId(request)
  const body = await request.json()
  await addFundsToBankCore(userId, body)
  return mobileOk({ added: true })
})
