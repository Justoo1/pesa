import { createHmac, timingSafeEqual } from "crypto"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import { revokeAllSessions } from "@/lib/account-security"

// ---------------------------------------------------------------------------
// PIN verification with lockout (shared by web and mobile)
// ---------------------------------------------------------------------------

const LOCKOUT_EVERY = 5 // wrong PINs before a cool-down
const LOCKOUT_MS = 15 * 60 * 1000
const SIGN_OUT_AFTER = 10 // consecutive wrong PINs → every session ends

export type PinCheck =
  | { ok: true }
  | { ok: false; error: string; signedOut?: boolean }

/**
 * Checks an app-lock PIN. Wrong PINs are counted atomically: every 5th
 * starts a 15-minute cool-down and the 10th in a row signs the user out
 * everywhere, so the 10,000 four-digit PINs can't be brute-forced.
 */
export async function checkAppPin(userId: string, pin: string): Promise<PinCheck> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { appLockPinHash: true, pinLockedUntil: true },
  })
  if (!user?.appLockPinHash) return { ok: false, error: "App lock isn't set up." }
  if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
    const mins = Math.ceil((user.pinLockedUntil.getTime() - Date.now()) / 60000)
    return { ok: false, error: `Too many wrong PINs. Try again in ${mins} min.` }
  }

  if (await bcrypt.compare(pin, user.appLockPinHash)) {
    await prisma.user.update({
      where: { id: userId },
      data: { pinFailedAttempts: 0, pinLockedUntil: null },
    })
    return { ok: true }
  }

  const { pinFailedAttempts: attempts } = await prisma.user.update({
    where: { id: userId },
    data: { pinFailedAttempts: { increment: 1 } },
    select: { pinFailedAttempts: true },
  })
  if (attempts >= SIGN_OUT_AFTER) {
    await prisma.$transaction(async (tx) => {
      await revokeAllSessions(tx, userId)
      await tx.user.update({
        where: { id: userId },
        data: { pinFailedAttempts: 0, pinLockedUntil: null },
      })
    })
    return { ok: false, signedOut: true, error: "Too many wrong PINs — signed out for safety." }
  }
  if (attempts % LOCKOUT_EVERY === 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { pinLockedUntil: new Date(Date.now() + LOCKOUT_MS) },
    })
    return { ok: false, error: "Too many wrong PINs. Try again in 15 min." }
  }
  return { ok: false, error: "Wrong PIN." }
}

// ---------------------------------------------------------------------------
// Web unlock cookie
// ---------------------------------------------------------------------------

const COOKIE = "pesa_unlock"
const UNLOCK_TTL_MS = 12 * 60 * 60 * 1000

function sign(payload: string): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error("AUTH_SECRET is not set")
  return createHmac("sha256", secret).update(payload).digest("base64url")
}

/** Marks this browser as unlocked for [userId] (httpOnly, signed, ≤12h). */
export async function setWebUnlocked(userId: string): Promise<void> {
  const payload = `${userId}.${Date.now() + UNLOCK_TTL_MS}`
  const jar = await cookies()
  jar.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Session cookie: also ends when the browser closes.
  })
}

export async function clearWebUnlocked(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE)
}

async function hasValidUnlockCookie(userId: string): Promise<boolean> {
  const raw = (await cookies()).get(COOKIE)?.value
  if (!raw) return false
  const i = raw.lastIndexOf(".")
  const payload = raw.slice(0, i)
  const given = Buffer.from(raw.slice(i + 1))
  const expected = Buffer.from(sign(payload))
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false
  const [cookieUser, exp] = payload.split(".")
  return cookieUser === userId && Number(exp) > Date.now()
}

/**
 * Whether the web app is locked for this user right now: they have a PIN and
 * this browser hasn't proven it since unlocking (or the unlock expired).
 */
export async function isWebLocked(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { appLockEnabled: true },
  })
  if (!user?.appLockEnabled) return false
  return !(await hasValidUnlockCookie(userId))
}
