import { NextResponse } from "next/server"
import { rejectUnauthorizedCron } from "@/lib/cron"
import { daysInMonth } from "@/lib/dates"
import { prisma } from "@/lib/db"
import { sendPushToUser } from "@/lib/push"

/**
 * Daily nudge for unpaid bills whose due-day is approaching. We look at bills
 * pots with `dueDayOfMonth` falling within the next 2 days and `allocated <
 * target` for the current calendar month — if so, push the user (provided
 * they have pushBillsDueOn enabled).
 *
 * Same auth as the other cron handlers (lib/cron.ts): Vercel cron sends
 * `Bearer $CRON_SECRET`, and the route refuses to run without one.
 */
export async function GET(request: Request) {
  const rejected = rejectUnauthorizedCron(request)
  if (rejected) return rejected

  const now = new Date()
  const today = now.getDate()

  // Build the set of dueDayOfMonth values that should trigger today. We send
  // 2 days before AND 1 day before AND on-the-day. Three different copies so
  // the urgency reads correctly.
  // A due day of 29–31 falls on the last day of shorter months, so near the
  // end of the month also match the days that don't exist this month.
  const lastDay = daysInMonth(now.getFullYear(), now.getMonth())
  const dueDays = [today, today + 1, today + 2].filter((d) => d <= lastDay)
  if (today + 2 >= lastDay) for (let d = lastDay + 1; d <= 31; d++) dueDays.push(d)
  const buckets = await prisma.bucket.findMany({
    where: {
      archivedAt: null,
      kind: "bills",
      dueDayOfMonth: { in: dueDays },
      user: { pushBillsDueOn: true },
    },
    select: {
      id: true,
      name: true,
      target: true,
      allocated: true,
      dueDayOfMonth: true,
      userId: true,
    },
  })

  // Only nudge for bills that are still unpaid (allocated < target). Target=0
  // pots are skipped — they signal "no commitment yet."
  const due = buckets.filter(
    (b) => b.target > 0 && b.allocated < b.target,
  )

  let pushSent = 0
  for (const b of due) {
    const day = Math.min(b.dueDayOfMonth!, lastDay)
    const diff = day - today
    const tone =
      diff === 0 ? "Due today" : diff === 1 ? "Due tomorrow" : `Due in ${diff} days`
    try {
      const r = await sendPushToUser(b.userId, {
        title: `${b.name} · ${tone}`,
        body: "Top up before it slips.",
        url: "/",
        tag: `bills-due-${b.id}-${now.getFullYear()}-${now.getMonth() + 1}-${day}`,
      })
      pushSent += r.sent
    } catch (e) {
      console.error("bills-due push error", b.id, e)
    }
  }

  return NextResponse.json({
    day: today,
    candidates: buckets.length,
    notified: due.length,
    push: pushSent,
  })
}
