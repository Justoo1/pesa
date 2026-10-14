import { deleteAccountCore } from "@/app/actions/settings"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { HttpError, mobileOk, withMobileRoute } from "@/lib/mobile/response"

/** `{ confirmEmail }` must match the account email. Deleting the user cascades its MobileSessions. */
export const POST = withMobileRoute(async (request) => {
  const userId = await requireMobileUserId(request)
  const result = await deleteAccountCore(userId, await request.json())
  if (!result.ok) throw new HttpError(400, "CONFLICT", result.error)
  return mobileOk({ deleted: true })
})
