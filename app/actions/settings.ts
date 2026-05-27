"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireUserId } from "@/lib/session"

const profileSchema = z.object({
  displayName: z.string().min(1).max(60).optional(),
  salary: z.number().int().nonnegative().optional(),
  currency: z.string().min(1).max(8).optional(),
  monthLabel: z.string().min(1).max(40).optional(),
})

export async function updateProfile(input: z.infer<typeof profileSchema>) {
  const userId = await requireUserId()
  const data = profileSchema.parse(input)
  await prisma.user.update({ where: { id: userId }, data })
  revalidatePath("/")
}

export async function resetMonth() {
  const userId = await requireUserId()
  await prisma.$transaction([
    prisma.transaction.deleteMany({ where: { userId } }),
    prisma.bucket.updateMany({ where: { userId }, data: { allocated: 0 } }),
  ])
  revalidatePath("/")
}
