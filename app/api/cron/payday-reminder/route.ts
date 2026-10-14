import { NextResponse } from "next/server"
import { rejectUnauthorizedCron } from "@/lib/cron"
import { appUrl, escapeHtml } from "@/lib/account-security"
import { paydayDaysMatching } from "@/lib/dates"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import { sendPushToUser } from "@/lib/push"
import { applyPaydayTemplateForUser, loadPaydayTemplate } from "@/lib/payday"

async function sendReminderEmail(email: string, displayName: string | null) {
  const link = `${appUrl()}/sign-in`
  const greeting = displayName ? `Hi ${displayName},` : "Hi,"
  await sendEmail({
    to: email,
    subject: "It's payday — disburse your salary in Pesa",
    // displayName is user-controlled: escape it before it goes into HTML.
    html: `<p>${escapeHtml(greeting)}</p>
<p>It's the day you asked to be nudged. Pop into Pesa and move your salary into pots before the cravings hit.</p>
<p><a href="${escapeHtml(link)}">Open Pesa</a></p>`,
    text: `${greeting}\n\nIt's payday — open Pesa to disburse: ${link}`,
  })
}

export async function GET(request: Request) {
  const rejected = rejectUnauthorizedCron(request)
  if (rejected) return rejected

  const now = new Date()
  const dayOfMonth = now.getDate()
  const paydayIn = { in: paydayDaysMatching(now) }
  const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  const emailUsers = await prisma.user.findMany({
    where: {
      paydayRemindersOn: true,
      paydayDayOfMonth: paydayIn,
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
      paydayDayOfMonth: paydayIn,
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
      paydayDayOfMonth: paydayIn,
    },
    select: { id: true },
  })

  let autoApplied = 0
  let autoUsersNotified = 0
  for (const u of autoUsers) {
    // Claim this month for the user before moving money, so a Vercel retry
    // or a second call the same day can never auto-disburse twice.
    const claimed = await prisma.user.updateMany({
      // (NULL never compares unequal in SQL, so match it explicitly.)
      where: {
        id: u.id,
        OR: [{ lastAutoPaydayYm: null }, { lastAutoPaydayYm: { not: currentYm } }],
      },
      data: { lastAutoPaydayYm: currentYm },
    })
    if (claimed.count !== 1) continue
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
