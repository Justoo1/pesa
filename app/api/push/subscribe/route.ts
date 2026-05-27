import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/db"
import { requireUserId } from "@/lib/session"

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().optional(),
})

export async function POST(request: Request) {
  const userId = await requireUserId()
  const body = await request.json()
  const parsed = subscribeSchema.parse(body)

  await prisma.pushSubscription.upsert({
    where: { endpoint: parsed.endpoint },
    create: {
      userId,
      endpoint: parsed.endpoint,
      p256dh: parsed.keys.p256dh,
      auth: parsed.keys.auth,
      userAgent: parsed.userAgent,
    },
    update: {
      userId,
      p256dh: parsed.keys.p256dh,
      auth: parsed.keys.auth,
      userAgent: parsed.userAgent,
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
