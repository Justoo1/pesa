import { loadFilledByMonth } from "@/lib/month"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

/**
 * `{ "YYYY-MM": { bucketId: filledAmount } }` — how much each pot received in
 * each month. The "add to a past month" sheet uses it to grey out pots that
 * were already full that month.
 */
export const GET = withMobileRoute(async (request) => {
  const userId = await requireMobileUserId(request)
  return mobileOk(await loadFilledByMonth(userId))
})
