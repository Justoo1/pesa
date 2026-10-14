import { archiveMilestoneCore } from "@/app/actions/projects"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const POST = withMobileRoute<{ id: string }>(async (request, { params }) => {
  const userId = await requireMobileUserId(request)
  const { id } = await params
  await archiveMilestoneCore(userId, { milestoneId: id })
  return mobileOk({ archived: true })
})
