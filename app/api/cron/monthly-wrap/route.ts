import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { sendPushToUser } from "@/lib/push"

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get("authorization")
  if (secret && auth !== `Bearer ${secret}`) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  const users = await prisma.user.findMany({
    where: { pushWrapOn: true },
    select: { id: true },
  })

  let sent = 0
  for (const u of users) {
    try {
      const r = await sendPushToUser(u.id, {
        title: "Your month is in",
        body: "See how your pots landed.",
        url: "/wrap",
        tag: "wrap",
      })
      sent += r.sent
    } catch (e) {
      console.error("wrap push error", u.id, e)
    }
  }

  return NextResponse.json({ users: users.length, sent })
}
