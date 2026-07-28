"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireUserId } from "@/lib/session"

async function syncSalary(userId: string) {
  const active = await prisma.incomeSource.findMany({
    where: { userId, active: true },
    select: { amount: true },
  })
  const salary = active.reduce((s, a) => s + a.amount, 0)
  await prisma.user.update({ where: { id: userId }, data: { salary } })
}

const createSchema = z.object({
  name: z.string().min(1).max(40),
  amount: z.number().int().nonnegative(),
})

export async function createIncomeSource(input: z.infer<typeof createSchema>) {
  const userId = await requireUserId()
  const { name, amount } = createSchema.parse(input)
  const count = await prisma.incomeSource.count({ where: { userId } })
  await prisma.incomeSource.create({
    data: { userId, name, amount, active: true, order: count },
  })
  await syncSalary(userId)
  revalidatePath("/")
}

const updateSchema = z.object({
  incomeSourceId: z.string().min(1),
  name: z.string().min(1).max(40),
  amount: z.number().int().nonnegative(),
})

export async function updateIncomeSource(input: z.infer<typeof updateSchema>) {
  const userId = await requireUserId()
  const { incomeSourceId, name, amount } = updateSchema.parse(input)
  const result = await prisma.incomeSource.updateMany({
    where: { id: incomeSourceId, userId },
    data: { name, amount },
  })
  if (result.count === 0) throw new Error("Income source not found")
  await syncSalary(userId)
  revalidatePath("/")
}

const toggleSchema = z.object({
  incomeSourceId: z.string().min(1),
  active: z.boolean(),
})

export async function toggleIncomeSource(input: z.infer<typeof toggleSchema>) {
  const userId = await requireUserId()
  const { incomeSourceId, active } = toggleSchema.parse(input)
  const result = await prisma.incomeSource.updateMany({
    where: { id: incomeSourceId, userId },
    data: { active },
  })
  if (result.count === 0) throw new Error("Income source not found")
  await syncSalary(userId)
  revalidatePath("/")
}

const deleteSchema = z.object({ incomeSourceId: z.string().min(1) })

export async function deleteIncomeSource(input: z.infer<typeof deleteSchema>) {
  const userId = await requireUserId()
  const { incomeSourceId } = deleteSchema.parse(input)
  const result = await prisma.incomeSource.deleteMany({
    where: { id: incomeSourceId, userId },
  })
  if (result.count === 0) throw new Error("Income source not found")
  await syncSalary(userId)
  revalidatePath("/")
}
