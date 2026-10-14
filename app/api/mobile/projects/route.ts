import { createProjectCore } from "@/app/actions/projects"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const POST = withMobileRoute(async (request) => {
  const userId = await requireMobileUserId(request)
  const body = await request.json()
  const project = await createProjectCore(userId, body)
  return mobileOk(project, 201)
})
