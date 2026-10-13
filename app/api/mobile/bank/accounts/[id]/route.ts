import { renameBankAccountCore } from "@/app/actions/bank"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const PATCH = withMobileRoute<{ id: string }>(async (request, { params }) => {
  const userId = await requireMobileUserId(request)
  const { id } = await params
  const body = await request.json()
  await renameBankAccountCore(userId, { ...body, accountId: id })
  return mobileOk({ updated: true })
})
