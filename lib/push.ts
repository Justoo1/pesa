import webpush from "web-push"

import { prisma } from "@/lib/db"

export type PushPayload = {
  title: string
  body: string
  url?: string
  tag?: string
}

let configured = false

function configure() {
  if (configured) return
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || "mailto:hello@pesa.app"
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys not configured")
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  configure()

  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  if (subs.length === 0) return { sent: 0, removed: 0 }

  const body = JSON.stringify(payload)
  const deadIds: string[] = []
  let sent = 0

  await Promise.all(
    subs.map(async (sub) => {
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

  return { sent, removed: deadIds.length }
}
