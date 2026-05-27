import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

async function sendReminder(email: string, displayName: string | null) {
  const apiKey = process.env.AUTH_RESEND_KEY
  if (!apiKey) {
    console.warn("AUTH_RESEND_KEY missing — would have emailed", email)
    return
  }
  const from =
    process.env.AUTH_EMAIL_FROM?.trim() || "Pesa <onboarding@resend.dev>"
  const base = process.env.AUTH_URL ?? "http://localhost:3000"
  const link = `${base}/sign-in`
  const greeting = displayName ? `Hi ${displayName},` : "Hi,"
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "It's payday — disburse your salary in Pesa",
      html: `<p>${greeting}</p>
<p>It's the day you asked to be nudged. Pop into Pesa and move your salary into pots before the cravings hit.</p>
<p><a href="${link}">Open Pesa</a></p>`,
      text: `${greeting}\n\nIt's payday — open Pesa to disburse: ${link}`,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error("Resend payday email failed:", res.status, body)
  }
}

export async function GET(request: Request) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get("authorization")
  if (secret && auth !== `Bearer ${secret}`) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  const dayOfMonth = new Date().getDate()
  const users = await prisma.user.findMany({
    where: {
      paydayRemindersOn: true,
      paydayDayOfMonth: dayOfMonth,
      email: { not: null },
    },
    select: { email: true, displayName: true },
  })

  for (const u of users) {
    if (!u.email) continue
    try {
      await sendReminder(u.email, u.displayName)
    } catch (e) {
      console.error("payday reminder send error", u.email, e)
    }
  }
  return NextResponse.json({ sent: users.length, day: dayOfMonth })
}
