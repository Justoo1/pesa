import { archiveBankAccountCore } from "@/app/actions/bank"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const POST = withMobileRoute<{ id: string }>(async (request, { params }) => {
  const userId = await requireMobileUserId(request)
  const { id } = await params
  await archiveBankAccountCore(userId, { accountId: id })
  return mobileOk({ archived: true })
})
