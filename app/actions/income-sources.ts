"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireUserId } from "@/lib/session"
import {
  createIncomeSourceSchema,
  deleteIncomeSourceSchema,
  toggleIncomeSourceSchema,
  updateIncomeSourceSchema,
} from "@/lib/mobile/schemas"

// Monthly income ceiling — keeps the int32 `User.salary` (and sums built on
// it) far from overflow.
const MAX_SALARY = 1_000_000_000

/**
 * Recomputes `User.salary` from active income sources. Always called inside
 * the same transaction as the income-source write, so the two can never
 * disagree (and an over-limit total rolls the write back).
 */
async function syncSalary(tx: Prisma.TransactionClient, userId: string) {
  const active = await tx.incomeSource.findMany({
    where: { userId, active: true },
    select: { amount: true },
  })
  const salary = active.reduce((s, a) => s + a.amount, 0)
  if (salary > MAX_SALARY) throw new Error("Total monthly income is too large")
  await tx.user.update({ where: { id: userId }, data: { salary } })
}

export async function createIncomeSourceCore(
  userId: string,
  input: z.infer<typeof createIncomeSourceSchema>,
) {
  const { name, amount } = createIncomeSourceSchema.parse(input)
  await prisma.$transaction(async (tx) => {
    const count = await tx.incomeSource.count({ where: { userId } })
    await tx.incomeSource.create({
      data: { userId, name, amount, active: true, order: count },
    })
    await syncSalary(tx, userId)
  })
  revalidatePath("/")
}

export async function createIncomeSource(input: z.infer<typeof createIncomeSourceSchema>) {
  const userId = await requireUserId()
  return createIncomeSourceCore(userId, input)
}

export async function updateIncomeSourceCore(
  userId: string,
  input: z.infer<typeof updateIncomeSourceSchema>,
) {
  const { incomeSourceId, name, amount } = updateIncomeSourceSchema.parse(input)
  await prisma.$transaction(async (tx) => {
    const result = await tx.incomeSource.updateMany({
      where: { id: incomeSourceId, userId },
      data: { name, amount },
    })
    if (result.count === 0) throw new Error("Income source not found")
    await syncSalary(tx, userId)
  })
  revalidatePath("/")
}

export async function updateIncomeSource(input: z.infer<typeof updateIncomeSourceSchema>) {
  const userId = await requireUserId()
  return updateIncomeSourceCore(userId, input)
}

export async function toggleIncomeSourceCore(
  userId: string,
  input: z.infer<typeof toggleIncomeSourceSchema>,
) {
  const { incomeSourceId, active } = toggleIncomeSourceSchema.parse(input)
  await prisma.$transaction(async (tx) => {
    const result = await tx.incomeSource.updateMany({
      where: { id: incomeSourceId, userId },
      data: { active },
    })
    if (result.count === 0) throw new Error("Income source not found")
    await syncSalary(tx, userId)
  })
  revalidatePath("/")
}

export async function toggleIncomeSource(input: z.infer<typeof toggleIncomeSourceSchema>) {
  const userId = await requireUserId()
  return toggleIncomeSourceCore(userId, input)
}

export async function deleteIncomeSourceCore(
  userId: string,
  input: z.infer<typeof deleteIncomeSourceSchema>,
) {
  const { incomeSourceId } = deleteIncomeSourceSchema.parse(input)
  await prisma.$transaction(async (tx) => {
    const result = await tx.incomeSource.deleteMany({
      where: { id: incomeSourceId, userId },
    })
    if (result.count === 0) throw new Error("Income source not found")
    await syncSalary(tx, userId)
  })
  revalidatePath("/")
}

export async function deleteIncomeSource(input: z.infer<typeof deleteIncomeSourceSchema>) {
  const userId = await requireUserId()
  return deleteIncomeSourceCore(userId, input)
}
