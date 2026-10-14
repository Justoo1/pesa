import { createIncomeSourceCore } from "@/app/actions/income-sources"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const POST = withMobileRoute(async (request) => {
  const userId = await requireMobileUserId(request)
  await createIncomeSourceCore(userId, await request.json())
  return mobileOk({ created: true }, 201)
})
