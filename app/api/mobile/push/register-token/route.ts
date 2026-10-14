import { prisma } from "@/lib/db"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { registerDeviceTokenSchema } from "@/lib/mobile/schemas"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

/**
 * Stores the device's FCM token. lib/push.ts sends to these through FCM once
 * `FCM_SERVICE_ACCOUNT` is configured (dormant until then). Upserting by
 * token moves a re-registered device to whichever user is signed in on it now.
 */
export const POST = withMobileRoute(async (request) => {
  const userId = await requireMobileUserId(request)
  const { fcmToken, platform } = registerDeviceTokenSchema.parse(await request.json())
  await prisma.mobileDeviceToken.upsert({
    where: { fcmToken },
    create: { userId, fcmToken, platform },
    update: { userId, platform },
  })
  return mobileOk({ registered: true })
})

/** Forget this device (called before signing out): `{ fcmToken }`. */
export const DELETE = withMobileRoute(async (request) => {
  const userId = await requireMobileUserId(request, { allowLocked: true })
  const { fcmToken } = registerDeviceTokenSchema.pick({ fcmToken: true }).parse(await request.json())
  await prisma.mobileDeviceToken.deleteMany({ where: { userId, fcmToken } })
  return mobileOk({ removed: true })
})
