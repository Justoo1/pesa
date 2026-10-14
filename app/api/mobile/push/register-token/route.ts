import { prisma } from "@/lib/db"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { registerDeviceTokenSchema } from "@/lib/mobile/schemas"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

/**
 * Stores the device's FCM token (Phase 7 stub). Intentionally inert: no
 * cron or lib/push.ts path reads MobileDeviceToken yet, so nothing is ever
 * sent to it. Upserting by token moves a re-registered device to whichever
 * user is signed in on it now.
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
