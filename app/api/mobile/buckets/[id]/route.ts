import { deleteBucketCore, updateBucketCore } from "@/app/actions/buckets"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const PATCH = withMobileRoute<{ id: string }>(async (request, { params }) => {
  const userId = await requireMobileUserId(request)
  const { id } = await params
  const body = await request.json()
  await updateBucketCore(userId, { ...body, bucketId: id })
  return mobileOk({ updated: true })
})

export const DELETE = withMobileRoute<{ id: string }>(async (request, { params }) => {
  const userId = await requireMobileUserId(request)
  const { id } = await params
  await deleteBucketCore(userId, { bucketId: id })
  return mobileOk({ deleted: true })
})
