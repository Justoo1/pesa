import { createBucketCore } from "@/app/actions/buckets"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const POST = withMobileRoute(async (request) => {
  const userId = await requireMobileUserId(request)
  const body = await request.json()
  const bucket = await createBucketCore(userId, body)
  return mobileOk(bucket, 201)
})
