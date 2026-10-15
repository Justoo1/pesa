"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { requireUserId } from "@/lib/session"
import { sendPushToUser } from "@/lib/push"
import { signOut } from "@/auth"
import { checkAppPin, clearWebUnlocked, setWebUnlocked } from "@/lib/app-lock"
import {
  appLockPinSchema,
  setAppLockSchema,
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

/**
 * Sets (or changes) the app-lock PIN. Changing an existing PIN needs the
 * current one — otherwise anyone at an unlocked device could swap it.
 */
export async function setAppLockCore(userId: string, input: z.infer<typeof setAppLockSchema>) {
  const { pin, currentPin } = setAppLockSchema.parse(input)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { appLockEnabled: true, appLockPinHash: true },
  })
  if (user?.appLockEnabled && user.appLockPinHash) {
    if (!currentPin) throw new Error("Enter your current PIN to change it.")
    const check = await checkAppPin(userId, currentPin)
    if (!check.ok) throw new Error(check.error)
  }
  const hash = await bcrypt.hash(pin, 10)
  await prisma.user.update({
    where: { id: userId },
    data: { appLockEnabled: true, appLockPinHash: hash, pinFailedAttempts: 0, pinLockedUntil: null },
  })
  revalidatePath("/")
}

export async function setAppLock(input: z.infer<typeof setAppLockSchema>) {
  const userId = await requireUserId()
  await setAppLockCore(userId, input)
  // Whoever just chose the PIN stays unlocked on this browser.
  await setWebUnlocked(userId)
}

export async function disableAppLockCore(userId: string, input: { pin: string }) {
  const { pin } = appLockPinSchema.parse(input)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { appLockPinHash: true },
  })
  if (user?.appLockPinHash) {
    // Same lockout as unlocking, so this can't be used to guess the PIN.
    const check = await checkAppPin(userId, pin)
    if (!check.ok) return { ok: false as const, error: check.error }
  }
  await prisma.user.update({
    where: { id: userId },
    data: { appLockEnabled: false, appLockPinHash: null, pinFailedAttempts: 0, pinLockedUntil: null },
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
  return checkAppPin(userId, pin)
}

/** Unlocks this browser (signed cookie) when the PIN is right. */
export async function verifyAppPin(input: { pin: string }) {
  const userId = await requireUserId({ allowLocked: true })
  const result = await verifyAppPinCore(userId, input)
  if (result.ok) await setWebUnlocked(userId)
  return result
}

/** "Lock now": forget this browser's unlock. */
export async function lockApp() {
  await requireUserId({ allowLocked: true })
  await clearWebUnlocked()
  revalidatePath("/")
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
  // The user row cascades to everything linked by id; sign-in codes and
  // magic-link tokens are keyed by email, so clear those too.
  const email = user.email.toLowerCase()
  await prisma.$transaction([
    prisma.mobileLoginCode.deleteMany({ where: { email } }),
    prisma.verificationToken.deleteMany({ where: { identifier: email } }),
    prisma.user.delete({ where: { id: userId } }),
  ])
  return { ok: true as const }
}

export async function deleteAccount(input: z.infer<typeof deleteAccountSchema>) {
  const userId = await requireUserId()
  const result = await deleteAccountCore(userId, input)
  if (!result.ok) return result
  await signOut({ redirectTo: "/sign-in" })
  return result
}
