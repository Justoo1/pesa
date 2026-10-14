import { loadMonthDetail } from "@/lib/insights"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { HttpError, mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const GET = withMobileRoute<{ ym: string }>(async (request, { params }) => {
  const userId = await requireMobileUserId(request)
  const { ym } = await params
  const detail = await loadMonthDetail(userId, ym)
  if (!detail) throw new HttpError(404, "NOT_FOUND", "Month not found")
  return mobileOk(detail)
})
