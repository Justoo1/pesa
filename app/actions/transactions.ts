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

export async function disburse(input: z.infer<typeof disburseSchema>) {
  const userId = await requireUserId()
  const { bucketId, amount, note, method } = disburseSchema.parse(input)

  const bucket = await prisma.bucket.findFirst({
    where: { id: bucketId, userId },
    select: { id: true },
  })
  if (!bucket) throw new Error("Bucket not found")

  const [txn] = await prisma.$transaction([
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
  ])

  revalidatePath("/")
  return { id: txn.id }
}
