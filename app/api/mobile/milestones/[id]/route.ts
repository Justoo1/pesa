import { updateMilestoneCore } from "@/app/actions/projects"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const PATCH = withMobileRoute<{ id: string }>(async (request, { params }) => {
  const userId = await requireMobileUserId(request)
  const { id } = await params
  const body = await request.json()
  await updateMilestoneCore(userId, { ...body, milestoneId: id })
  return mobileOk({ updated: true })
})
