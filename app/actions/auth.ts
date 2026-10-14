"use server"

import { createHash, randomBytes } from "crypto"
import bcrypt from "bcryptjs"
import { AuthError, CredentialsSignin } from "next-auth"
import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import { seedNewUser } from "@/lib/seed"
import { signIn, signOut } from "@/auth"
import { registerSchema } from "@/lib/mobile/schemas"
import { BCRYPT_COST, appUrl, escapeHtml, revokeAllSessions } from "@/lib/account-security"
import { RateLimitError, enforceRateLimits, limits } from "@/lib/rate-limit"
import { actionIp } from "@/lib/request-ip"

export type AuthResult = { ok: true } | { ok: false; error: string }

export async function registerUser(formData: FormData): Promise<AuthResult> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const email = parsed.data.email.toLowerCase()
  try {
    await enforceRateLimits([limits.signupByIp(await actionIp())])
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false, error: e.message }
    throw e
  }
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    return {
      ok: false,
      error: "Couldn't create that account. If it's yours, sign in or reset your password.",
    }
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_COST)
  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      displayName: parsed.data.name,
      passwordHash,
      // Nobody has proven they own this inbox yet (see lib/account-security.ts).
      passwordUnverified: true,
    },
  })
  await seedNewUser(user.id)

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/",
    })
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, error: "Account created but sign-in failed. Try signing in." }
    }
    throw e
  }
  return { ok: true }
}

export async function signInWithCredentials(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").toLowerCase()
  const password = String(formData.get("password") ?? "")
  if (!email || !password) return { ok: false, error: "Email and password required." }
  try {
    await signIn("credentials", { email, password, redirectTo: "/" })
  } catch (e) {
    if (e instanceof AuthError) {
      if (e instanceof CredentialsSignin && e.code === "rate_limited") {
        return { ok: false, error: "Too many attempts. Please wait a bit and try again." }
      }
      if (e.type === "CredentialsSignin") {
        return { ok: false, error: "Wrong email or password." }
      }
      return { ok: false, error: "Sign-in failed. Try again." }
    }
    throw e
  }
  return { ok: true }
}

export async function signInWithEmail(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").toLowerCase()
  if (!email) return { ok: false, error: "Enter an email address." }
  try {
    await enforceRateLimits(
      [
        limits.emailSendByEmail(email),
        limits.emailSendByEmailDaily(email),
        limits.emailSendByIp(await actionIp()),
      ],
      "Too many sign-in links requested. Please wait a few minutes.",
    )
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false, error: e.message }
    throw e
  }
  try {
    await signIn("resend", { email, redirectTo: "/" })
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, error: "Could not send magic link." }
    }
    throw e
  }
  return { ok: true }
}

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/" })
}

export async function signOutAction() {
  await signOut({ redirectTo: "/sign-in" })
}

const RESET_TOKEN_BYTES = 32
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

/** Only a SHA-256 of a reset token is ever stored. */
function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

async function sendResetEmail(email: string, resetUrl: string) {
  const href = escapeHtml(resetUrl)
  await sendEmail({
    to: email,
    subject: "Reset your Pesa password",
    html: `<p>You requested a password reset for Pesa.</p>
<p><a href="${href}">Click here to choose a new password.</a></p>
<p>The link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
    text: `Reset your Pesa password: ${resetUrl}

The link expires in 1 hour.`,
  })
}

export async function requestPasswordReset(
  formData: FormData,
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim()
  if (!email) return { ok: false, error: "Enter an email address." }
  try {
    await enforceRateLimits(
      [
        limits.emailSendByEmail(email),
        limits.emailSendByEmailDaily(email),
        limits.emailSendByIp(await actionIp()),
      ],
      "Too many reset requests. Please wait a few minutes.",
    )
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false, error: e.message }
    throw e
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  // Always succeed silently to avoid leaking which emails are registered.
  if (!user) return { ok: true }

  const token = randomBytes(RESET_TOKEN_BYTES).toString("hex")
  // One live link per account: a new request invalidates any earlier one.
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    }),
  ])

  const resetUrl = `${appUrl()}/reset-password/${token}`
  try {
    await sendResetEmail(email, resetUrl)
  } catch (e) {
    console.error("sendResetEmail failed:", e)
    return { ok: false, error: "Could not send reset email." }
  }
  return { ok: true }
}

export async function resetPassword(
  formData: FormData,
): Promise<AuthResult> {
  const token = String(formData.get("token") ?? "")
  const password = String(formData.get("password") ?? "")
  if (!token || password.length < 8) {
    return { ok: false, error: "Token and a password of 8+ characters required." }
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    include: { user: { select: { email: true } } },
  })
  if (!record || record.expiresAt < new Date() || !record.user.email) {
    if (record) await prisma.passwordResetToken.delete({ where: { id: record.id } }).catch(() => {})
    return { ok: false, error: "Reset link is invalid or expired." }
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST)
  await prisma.$transaction(async (tx) => {
    // The emailed link proves inbox ownership, so the new password is trusted.
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, passwordUnverified: false, emailVerified: new Date() },
    })
    await tx.passwordResetToken.deleteMany({ where: { userId: record.userId } })
    // Whoever had the old password (or a stolen session) is signed out everywhere.
    await revokeAllSessions(tx, record.userId)
  })

  try {
    await signIn("credentials", {
      email: record.user.email,
      password,
      redirectTo: "/",
    })
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, error: "Password reset, but sign-in failed. Try signing in." }
    }
    throw e
  }
  return { ok: true }
}
