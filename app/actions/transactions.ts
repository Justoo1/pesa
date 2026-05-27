"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireUserId } from "@/lib/session"
import { sendPushToUser } from "@/lib/push"

const disburseSchema = z.object({
  bucketId: z.string().min(1),
  amount: z.number().int().positive(),
  note: z.string().max(200).optional(),
  method: z.string().max(40).optional(),
  occurredAt: z.coerce.date().optional(),
})

const ROUND_UP_STEP = 50

function isInCurrentCalendarMonth(d: Date) {
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

export async function disburse(input: z.infer<typeof disburseSchema>) {
  const userId = await requireUserId()
  const { bucketId, amount, note, method, occurredAt } = disburseSchema.parse(input)
  // Round-ups only make sense for transactions in the current month — backdated
  // entries should land cleanly in their own month without spilling a remainder
  // into today's "future" pot.
  const allowRoundUp = !occurredAt || isInCurrentCalendarMonth(occurredAt)

  const [bucket, user, savingsBucket] = await Promise.all([
    prisma.bucket.findFirst({
      where: { id: bucketId, userId },
      select: { id: true, name: true, target: true, allocated: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { roundUpsEnabled: true, pushBucketHitOn: true },
    }),
    prisma.bucket.findFirst({
      where: { userId, kind: "future", archivedAt: null },
      orderBy: { priority: "asc" },
      select: { id: true },
    }),
  ])
  if (!bucket) throw new Error("Bucket not found")

  const ops = [
    prisma.transaction.create({
      data: {
        userId,
        bucketId,
        amount,
        note: note || "Top-up",
        method: method || "MoMo",
        ...(occurredAt ? { occurredAt } : {}),
      },
    }),
    prisma.bucket.update({
      where: { id: bucketId },
      data: { allocated: { increment: amount } },
    }),
  ]

  // Round-up: if enabled, route the rounding remainder to the first future-kind
  // pot (typically "Savings"). Skip when the target pot is the savings pot
  // itself (can't round into yourself).
  let roundUp = 0
  if (allowRoundUp && user?.roundUpsEnabled && savingsBucket && savingsBucket.id !== bucketId) {
    const remainder = amount % ROUND_UP_STEP
    roundUp = remainder === 0 ? 0 : ROUND_UP_STEP - remainder
    if (roundUp > 0) {
      ops.push(
        prisma.transaction.create({
          data: {
            userId,
            bucketId: savingsBucket.id,
            amount: roundUp,
            note: "Round-up",
            method: method || "MoMo",
          },
        }),
        prisma.bucket.update({
          where: { id: savingsBucket.id },
          data: { allocated: { increment: roundUp } },
        }),
      )
    }
  }

  await prisma.$transaction(ops)

  // Bucket target reached: fire push if we crossed from below-target to
  // at-or-above-target on this disbursement. Only current-month disbursements
  // trigger — backdated edits shouldn't fire celebrations now.
  const crossedTarget =
    allowRoundUp &&
    bucket.target > 0 &&
    bucket.allocated < bucket.target &&
    bucket.allocated + amount >= bucket.target
  if (crossedTarget && user?.pushBucketHitOn) {
    try {
      await sendPushToUser(userId, {
        title: `${bucket.name} is full 🎉`,
        body: "Target reached.",
        url: "/",
        tag: `bucket-${bucket.id}`,
      })
    } catch (e) {
      console.error("bucket-hit push error", e)
    }
  }

  revalidatePath("/")
  if (occurredAt) {
    const ym = `${occurredAt.getFullYear()}-${String(occurredAt.getMonth() + 1).padStart(2, "0")}`
    revalidatePath("/months")
    revalidatePath(`/months/${ym}`)
  }
  return { roundUp }
}
