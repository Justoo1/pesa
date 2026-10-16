import { markOnboardedCore } from "@/lib/onboarding"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

/**
 * The phone's welcome screens were seen, so the web app shouldn't show its
 * own welcome slides to this account again.
 */
export const POST = withMobileRoute(async (request) => {
  const userId = await requireMobileUserId(request)
  await markOnboardedCore(userId)
  return mobileOk({ done: true })
})
