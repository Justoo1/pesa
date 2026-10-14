import { markTourCompletedCore } from "@/app/actions/tour"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

/** The first-run tour was finished or skipped — don't show it again. */
export const POST = withMobileRoute(async (request) => {
  const userId = await requireMobileUserId(request)
  await markTourCompletedCore(userId)
  return mobileOk({ done: true })
})
