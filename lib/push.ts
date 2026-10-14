import webpush from "web-push"

import { prisma } from "@/lib/db"
import { isFcmConfigured, sendFcm } from "@/lib/fcm"
import { isAllowedPushEndpoint } from "@/lib/push-hosts"

export type PushPayload = {
  title: string
  body: string
  url?: string
  tag?: string
}

let configured = false

/** Web Push needs VAPID keys; without them only phone push (FCM) is used. */
function configureWebPush(): boolean {
  if (configured) return true
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || "mailto:hello@pesa.app"
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
  return true
}

/**
 * Sends a notification to every browser (Web Push) and phone (FCM) the user
 * has registered. Each channel is skipped when it isn't configured; dead
 * subscriptions/tokens are pruned.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  const [webSent, webRemoved] = await sendWebPush(userId, payload)
  const [mobileSent, mobileRemoved] = await sendMobilePush(userId, payload)
  return { sent: webSent + mobileSent, removed: webRemoved + mobileRemoved }
}

async function sendWebPush(userId: string, payload: PushPayload): Promise<[number, number]> {
  if (!configureWebPush()) return [0, 0]
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  if (subs.length === 0) return [0, 0]

  const body = JSON.stringify(payload)
  const deadIds: string[] = []
  let sent = 0

  await Promise.all(
    subs.map(async (sub) => {
      // Never POST to anything but a real push service (SSRF guard), even if
      // an older row predates the subscribe-time check.
      if (!isAllowedPushEndpoint(sub.endpoint)) {
        deadIds.push(sub.id)
        return
      }
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        )
        sent++
      } catch (e: unknown) {
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          deadIds.push(sub.id)
        } else {
          console.error("push send failed", sub.endpoint, e)
        }
      }
    }),
  )

  if (deadIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: deadIds } } })
  }
  return [sent, deadIds.length]
}

async function sendMobilePush(userId: string, payload: PushPayload): Promise<[number, number]> {
  if (!isFcmConfigured()) return [0, 0]
  const devices = await prisma.mobileDeviceToken.findMany({
    where: { userId },
    select: { fcmToken: true },
  })
  const { sent, deadTokens } = await sendFcm(
    devices.map((d) => d.fcmToken),
    payload,
  )
  if (deadTokens.length > 0) {
    await prisma.mobileDeviceToken.deleteMany({ where: { fcmToken: { in: deadTokens } } })
  }
  return [sent, deadTokens.length]
}
