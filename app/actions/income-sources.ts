"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireUserId } from "@/lib/session"
import {
  createIncomeSourceSchema,
  deleteIncomeSourceSchema,
  toggleIncomeSourceSchema,
  updateIncomeSourceSchema,
} from "@/lib/mobile/schemas"

async function syncSalary(userId: string) {
  const active = await prisma.incomeSource.findMany({
    where: { userId, active: true },
    select: { amount: true },
  })
  const salary = active.reduce((s, a) => s + a.amount, 0)
  await prisma.user.update({ where: { id: userId }, data: { salary } })
}

export async function createIncomeSourceCore(
  userId: string,
  input: z.infer<typeof createIncomeSourceSchema>,
) {
  const { name, amount } = createIncomeSourceSchema.parse(input)
  const count = await prisma.incomeSource.count({ where: { userId } })
  await prisma.incomeSource.create({
    data: { userId, name, amount, active: true, order: count },
  })
  await syncSalary(userId)
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
  const result = await prisma.incomeSource.updateMany({
    where: { id: incomeSourceId, userId },
    data: { name, amount },
  })
  if (result.count === 0) throw new Error("Income source not found")
  await syncSalary(userId)
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
  const result = await prisma.incomeSource.updateMany({
    where: { id: incomeSourceId, userId },
    data: { active },
  })
  if (result.count === 0) throw new Error("Income source not found")
  await syncSalary(userId)
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
  const result = await prisma.incomeSource.deleteMany({
    where: { id: incomeSourceId, userId },
  })
  if (result.count === 0) throw new Error("Income source not found")
  await syncSalary(userId)
  revalidatePath("/")
}

export async function deleteIncomeSource(input: z.infer<typeof deleteIncomeSourceSchema>) {
  const userId = await requireUserId()
  return deleteIncomeSourceCore(userId, input)
}
