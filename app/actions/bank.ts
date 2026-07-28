"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireUserId } from "@/lib/session"

const addFundsSchema = z.object({
  amount: z.number().int().positive(),
  note: z.string().max(200).optional(),
})

export async function addFundsToBank(input: z.infer<typeof addFundsSchema>) {
  const userId = await requireUserId()
  const { amount, note } = addFundsSchema.parse(input)
  await prisma.$transaction([
    prisma.bankTransaction.create({
      data: { userId, amount, kind: "manual", note: note?.trim() || "Added funds" },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { bankBalance: { increment: amount } },
    }),
  ])
  revalidatePath("/")
}

const spendFromBankSchema = z.object({
  amount: z.number().int().positive(),
  note: z.string().max(200).optional(),
})

export async function spendFromBank(input: z.infer<typeof spendFromBankSchema>) {
  const userId = await requireUserId()
  const { amount, note } = spendFromBankSchema.parse(input)
  await prisma.$transaction([
    prisma.bankTransaction.create({
      data: { userId, amount: -amount, kind: "spend", note: note?.trim() || "Personal spend" },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { bankBalance: { decrement: amount } },
    }),
  ])
  revalidatePath("/")
}
