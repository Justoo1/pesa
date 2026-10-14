"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { requireUserId } from "@/lib/session"
import { sendPushToUser } from "@/lib/push"
import { signOut } from "@/auth"
import {
  appLockPinSchema,
  deleteAccountSchema,
  paydayPrefsSchema,
  pushPrefsSchema,
  roundUpsPrefsSchema,
  updateProfileSchema,
} from "@/lib/mobile/schemas"

export async function updateProfileCore(userId: string, input: z.infer<typeof updateProfileSchema>) {
  const data = updateProfileSchema.parse(input)
  await prisma.user.update({ where: { id: userId }, data })
  revalidatePath("/")
}

export async function updateProfile(input: z.infer<typeof updateProfileSchema>) {
  const userId = await requireUserId()
  return updateProfileCore(userId, input)
}

export async function resetMonthCore(userId: string) {
  // Only clear *this* calendar month — past months are history and must
  // survive a reset (they power /months, insights and the annual wrap).
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  await prisma.$transaction([
    prisma.transaction.deleteMany({
      where: { userId, occurredAt: { gte: start, lt: end } },
    }),
    prisma.bucket.updateMany({
      where: { userId },
      data: { allocated: 0, spent: 0 },
    }),
  ])
  revalidatePath("/")
  revalidatePath("/months")
  revalidatePath(`/months/${ym}`)
}

export async function resetMonth() {
  const userId = await requireUserId()
  return resetMonthCore(userId)
}

export async function setRoundUpsPrefsCore(
  userId: string,
  input: z.infer<typeof roundUpsPrefsSchema>,
) {
  const parsed = roundUpsPrefsSchema.parse(input)
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(parsed.enabled !== undefined && { roundUpsEnabled: parsed.enabled }),
      ...(parsed.step !== undefined && { roundUpStep: parsed.step }),
    },
  })
  revalidatePath("/")
}

export async function setRoundUpsPrefs(input: z.infer<typeof roundUpsPrefsSchema>) {
  const userId = await requireUserId()
  return setRoundUpsPrefsCore(userId, input)
}

export async function toggleRoundUps(enabled: boolean) {
  return setRoundUpsPrefs({ enabled: !!enabled })
}

export async function setPaydayPrefsCore(userId: string, input: z.infer<typeof paydayPrefsSchema>) {
  const parsed = paydayPrefsSchema.parse(input)
  await prisma.user.update({
    where: { id: userId },
    data: {
      paydayRemindersOn: parsed.enabled,
      paydayDayOfMonth: parsed.enabled ? (parsed.dayOfMonth ?? null) : null,
      ...(parsed.autoPayday !== undefined && { autoPaydayOn: parsed.autoPayday }),
    },
  })
  revalidatePath("/")
}

export async function setPaydayPrefs(input: z.infer<typeof paydayPrefsSchema>) {
  const userId = await requireUserId()
  return setPaydayPrefsCore(userId, input)
}

export async function setPushPrefsCore(userId: string, input: z.infer<typeof pushPrefsSchema>) {
  const parsed = pushPrefsSchema.parse(input)
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(parsed.payday !== undefined && { pushPaydayOn: parsed.payday }),
      ...(parsed.bucketHit !== undefined && { pushBucketHitOn: parsed.bucketHit }),
      ...(parsed.wrap !== undefined && { pushWrapOn: parsed.wrap }),
      ...(parsed.billsDue !== undefined && { pushBillsDueOn: parsed.billsDue }),
    },
  })
  revalidatePath("/")
}

export async function setPushPrefs(input: z.infer<typeof pushPrefsSchema>) {
  const userId = await requireUserId()
  return setPushPrefsCore(userId, input)
}

export async function sendTestPush() {
  const userId = await requireUserId()
  const result = await sendPushToUser(userId, {
    title: "Pesa test",
    body: "Push is wired up. Tap to open.",
    url: "/",
    tag: "test",
  })
  if (result.sent === 0) {
    throw new Error("No active subscriptions on this account.")
  }
  return result
}

export async function setAppLockCore(userId: string, input: { pin: string }) {
  const { pin } = appLockPinSchema.parse(input)
  const hash = await bcrypt.hash(pin, 10)
  await prisma.user.update({
    where: { id: userId },
    data: { appLockEnabled: true, appLockPinHash: hash },
  })
  revalidatePath("/")
}

export async function setAppLock(input: { pin: string }) {
  const userId = await requireUserId()
  return setAppLockCore(userId, input)
}

export async function disableAppLockCore(userId: string, input: { pin: string }) {
  const { pin } = appLockPinSchema.parse(input)
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

export async function disableAppLock(input: { pin: string }) {
  const userId = await requireUserId()
  return disableAppLockCore(userId, input)
}

export async function verifyAppPinCore(userId: string, input: { pin: string }) {
  const { pin } = appLockPinSchema.parse(input)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { appLockPinHash: true },
  })
  if (!user?.appLockPinHash) return { ok: false }
  const ok = await bcrypt.compare(pin, user.appLockPinHash)
  return { ok }
}

export async function verifyAppPin(input: { pin: string }): Promise<{
  ok: boolean
}> {
  const userId = await requireUserId()
  return verifyAppPinCore(userId, input)
}

/** Deletes the user (cascades everything) once the typed email matches. */
export async function deleteAccountCore(userId: string, input: z.infer<typeof deleteAccountSchema>) {
  const { confirmEmail } = deleteAccountSchema.parse(input)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  if (!user?.email || user.email.toLowerCase() !== confirmEmail.toLowerCase()) {
    return { ok: false as const, error: "Email did not match." }
  }
  await prisma.user.delete({ where: { id: userId } })
  return { ok: true as const }
}

export async function deleteAccount(input: z.infer<typeof deleteAccountSchema>) {
  const userId = await requireUserId()
  const result = await deleteAccountCore(userId, input)
  if (!result.ok) return result
  await signOut({ redirectTo: "/sign-in" })
  return result
}
