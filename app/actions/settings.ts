"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { requireUserId } from "@/lib/session"
import { signOut } from "@/auth"

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

export async function toggleRoundUps(enabled: boolean) {
  const userId = await requireUserId()
  await prisma.user.update({
    where: { id: userId },
    data: { roundUpsEnabled: !!enabled },
  })
  revalidatePath("/")
}

const paydaySchema = z.object({
  enabled: z.boolean(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
})

export async function setPaydayPrefs(input: z.infer<typeof paydaySchema>) {
  const userId = await requireUserId()
  const parsed = paydaySchema.parse(input)
  await prisma.user.update({
    where: { id: userId },
    data: {
      paydayRemindersOn: parsed.enabled,
      paydayDayOfMonth: parsed.enabled ? (parsed.dayOfMonth ?? null) : null,
    },
  })
  revalidatePath("/")
}

const pinSchema = z.object({ pin: z.string().regex(/^\d{4,8}$/) })

export async function setAppLock(input: { pin: string }) {
  const userId = await requireUserId()
  const { pin } = pinSchema.parse(input)
  const hash = await bcrypt.hash(pin, 10)
  await prisma.user.update({
    where: { id: userId },
    data: { appLockEnabled: true, appLockPinHash: hash },
  })
  revalidatePath("/")
}

export async function disableAppLock(input: { pin: string }) {
  const userId = await requireUserId()
  const { pin } = pinSchema.parse(input)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { appLockPinHash: true },
  })
  if (!user?.appLockPinHash) {
    await prisma.user.update({
      where: { id: userId },
      data: { appLockEnabled: false, appLockPinHash: null },
    })
    revalidatePath("/")
    return { ok: true as const }
  }
  const ok = await bcrypt.compare(pin, user.appLockPinHash)
  if (!ok) return { ok: false as const, error: "Wrong PIN." }
  await prisma.user.update({
    where: { id: userId },
    data: { appLockEnabled: false, appLockPinHash: null },
  })
  revalidatePath("/")
  return { ok: true as const }
}

export async function verifyAppPin(input: { pin: string }): Promise<{
  ok: boolean
}> {
  const userId = await requireUserId()
  const { pin } = pinSchema.parse(input)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { appLockPinHash: true },
  })
  if (!user?.appLockPinHash) return { ok: false }
  const ok = await bcrypt.compare(pin, user.appLockPinHash)
  return { ok }
}

const deleteSchema = z.object({ confirmEmail: z.string().email() })

export async function deleteAccount(input: z.infer<typeof deleteSchema>) {
  const userId = await requireUserId()
  const { confirmEmail } = deleteSchema.parse(input)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  if (!user?.email || user.email.toLowerCase() !== confirmEmail.toLowerCase()) {
    return { ok: false as const, error: "Email did not match." }
  }
  await prisma.user.delete({ where: { id: userId } })
  await signOut({ redirectTo: "/sign-in" })
  return { ok: true as const }
}
