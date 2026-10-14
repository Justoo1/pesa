import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/db"
import { requireUserId } from "@/lib/session"
import { isAllowedPushEndpoint } from "@/lib/push-hosts"

const subscribeSchema = z.object({
  endpoint: z
    .string()
    .url()
    .refine(isAllowedPushEndpoint, "Not a supported browser push service"),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().optional(),
})

export async function POST(request: Request) {
  const userId = await requireUserId()
  const parsed = subscribeSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 })
  const sub = parsed.data

  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: {
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userAgent: sub.userAgent,
    },
    update: {
      userId,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userAgent: sub.userAgent,
    },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const userId = await requireUserId()
  const endpoint = new URL(request.url).searchParams.get("endpoint")
  if (!endpoint) return new NextResponse("endpoint required", { status: 400 })

  await prisma.pushSubscription.deleteMany({
    where: { userId, endpoint },
  })

  return NextResponse.json({ ok: true })
}
