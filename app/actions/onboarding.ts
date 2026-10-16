"use server"

import { revalidatePath } from "next/cache"
import { markOnboardedCore } from "@/lib/onboarding"
import { requireUserId } from "@/lib/session"

export async function markOnboarded() {
  const userId = await requireUserId()
  await markOnboardedCore(userId)
  revalidatePath("/")
}
