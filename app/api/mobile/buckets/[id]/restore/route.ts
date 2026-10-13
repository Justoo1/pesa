import { restoreBucketCore } from "@/app/actions/buckets"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const POST = withMobileRoute<{ id: string }>(async (request, { params }) => {
  const userId = await requireMobileUserId(request)
  const { id } = await params
  await restoreBucketCore(userId, { bucketId: id })
  return mobileOk({ restored: true })
})
