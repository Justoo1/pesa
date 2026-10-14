import { NextResponse } from "next/server"
import { rejectUnauthorizedCron } from "@/lib/cron"
import { prisma } from "@/lib/db"
import { sendPushToUser } from "@/lib/push"

export async function GET(request: Request) {
  const rejected = rejectUnauthorizedCron(request)
  if (rejected) return rejected

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
