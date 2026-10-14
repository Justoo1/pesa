import { deleteIncomeSourceCore, updateIncomeSourceCore } from "@/app/actions/income-sources"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const PATCH = withMobileRoute<{ id: string }>(async (request, { params }) => {
  const userId = await requireMobileUserId(request)
  const { id } = await params
  const body = await request.json()
  await updateIncomeSourceCore(userId, { ...body, incomeSourceId: id })
  return mobileOk({ updated: true })
})

export const DELETE = withMobileRoute<{ id: string }>(async (request, { params }) => {
  const userId = await requireMobileUserId(request)
  const { id } = await params
  await deleteIncomeSourceCore(userId, { incomeSourceId: id })
  return mobileOk({ deleted: true })
})
