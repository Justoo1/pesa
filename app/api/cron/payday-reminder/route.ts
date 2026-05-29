import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import { sendPushToUser } from "@/lib/push"
import { applyPaydayTemplateForUser, loadPaydayTemplate } from "@/lib/payday"

async function sendReminderEmail(email: string, displayName: string | null) {
  const base = process.env.AUTH_URL ?? "http://localhost:3000"
  const link = `${base}/sign-in`
  const greeting = displayName ? `Hi ${displayName},` : "Hi,"
  await sendEmail({
    to: email,
    subject: "It's payday — disburse your salary in Pesa",
    html: `<p>${greeting}</p>
<p>It's the day you asked to be nudged. Pop into Pesa and move your salary into pots before the cravings hit.</p>
<p><a href="${link}">Open Pesa</a></p>`,
    text: `${greeting}\n\nIt's payday — open Pesa to disburse: ${link}`,
  })
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get("authorization")
  if (secret && auth !== `Bearer ${secret}`) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  const dayOfMonth = new Date().getDate()

  const emailUsers = await prisma.user.findMany({
    where: {
      paydayRemindersOn: true,
      paydayDayOfMonth: dayOfMonth,
      email: { not: null },
    },
    select: { email: true, displayName: true },
  })

  for (const u of emailUsers) {
    if (!u.email) continue
    try {
      await sendReminderEmail(u.email, u.displayName)
    } catch (e) {
      console.error("payday email error", u.email, e)
    }
  }

  const pushUsers = await prisma.user.findMany({
    where: {
      pushPaydayOn: true,
      paydayDayOfMonth: dayOfMonth,
    },
    select: { id: true },
  })

  let pushSent = 0
  for (const u of pushUsers) {
    try {
      const r = await sendPushToUser(u.id, {
        title: "It's payday",
        body: "Disburse your salary into pots.",
        url: "/",
        tag: "payday",
      })
      pushSent += r.sent
    } catch (e) {
      console.error("payday push error", u.id, e)
    }
  }

  // Auto-disburse pass. Independent of the email/push reminders above so that
  // users can choose to silently auto-disburse without reminders too.
  const autoUsers = await prisma.user.findMany({
    where: {
      autoPaydayOn: true,
      paydayDayOfMonth: dayOfMonth,
    },
    select: { id: true },
  })

  let autoApplied = 0
  let autoUsersNotified = 0
  for (const u of autoUsers) {
    try {
      const template = await loadPaydayTemplate(u.id)
      if (template.length === 0) continue
      const drafts = template.map((d) => ({
        bucketId: d.bucketId,
        amount: d.amount,
        note: "Auto-payday",
      }))
      const res = await applyPaydayTemplateForUser(u.id, drafts)
      if (res.applied > 0) {
        autoApplied += res.applied
        revalidatePath("/")
        try {
          const r = await sendPushToUser(u.id, {
            title: "Disbursed for you",
            body: `${res.applied} pot${res.applied === 1 ? "" : "s"} topped up — tap to review.`,
            url: "/",
            tag: `auto-payday-${new Date().getFullYear()}-${new Date().getMonth() + 1}`,
          })
          if (r.sent > 0) autoUsersNotified += 1
        } catch (e) {
          console.error("auto-payday push error", u.id, e)
        }
      }
    } catch (e) {
      console.error("auto-payday apply error", u.id, e)
    }
  }

  return NextResponse.json({
    day: dayOfMonth,
    email: emailUsers.length,
    push: pushSent,
    autoUsers: autoUsers.length,
    autoApplied,
    autoUsersNotified,
  })
}
