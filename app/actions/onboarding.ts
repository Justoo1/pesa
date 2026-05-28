"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { requireUserId } from "@/lib/session"

export async function markOnboarded() {
  const userId = await requireUserId()
  await prisma.user.update({
    where: { id: userId },
    data: { onboardedAt: new Date() },
  })
  revalidatePath("/")
}
