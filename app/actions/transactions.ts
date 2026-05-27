"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireUserId } from "@/lib/session"

const disburseSchema = z.object({
  bucketId: z.string().min(1),
  amount: z.number().int().positive(),
  note: z.string().max(200).optional(),
  method: z.string().max(40).optional(),
})

const ROUND_UP_STEP = 50

export async function disburse(input: z.infer<typeof disburseSchema>) {
  const userId = await requireUserId()
  const { bucketId, amount, note, method } = disburseSchema.parse(input)

  const [bucket, user, savingsBucket] = await Promise.all([
    prisma.bucket.findFirst({
      where: { id: bucketId, userId },
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { roundUpsEnabled: true },
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
  if (user?.roundUpsEnabled && savingsBucket && savingsBucket.id !== bucketId) {
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

  revalidatePath("/")
  return { roundUp }
}
