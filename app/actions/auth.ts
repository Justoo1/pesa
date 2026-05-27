"use server"

import { randomBytes } from "crypto"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { AuthError } from "next-auth"
import { prisma } from "@/lib/db"
import { seedNewUser } from "@/lib/seed"
import { signIn, signOut } from "@/auth"

const registerSchema = z.object({
  name: z.string().min(1).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(120),
})

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
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { ok: false, error: "An account with this email already exists." }
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 10)
  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      displayName: parsed.data.name,
      passwordHash,
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

async function sendResetEmail(email: string, resetUrl: string) {
  const apiKey = process.env.AUTH_RESEND_KEY
  if (!apiKey) {
    console.warn("AUTH_RESEND_KEY missing — printing reset link:", resetUrl)
    return
  }
  const from =
    process.env.AUTH_EMAIL_FROM?.trim() || "Pesa <onboarding@resend.dev>"
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Reset your Pesa password",
      html: `<p>You requested a password reset for Pesa.</p>
<p><a href="${resetUrl}">Click here to choose a new password.</a></p>
<p>The link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
      text: `Reset your Pesa password: ${resetUrl}\n\nThe link expires in 1 hour.`,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend failed: ${res.status} ${body}`)
  }
}

export async function requestPasswordReset(
  formData: FormData,
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim()
  if (!email) return { ok: false, error: "Enter an email address." }

  const user = await prisma.user.findUnique({ where: { email } })
  // Always succeed silently to avoid leaking which emails are registered.
  if (!user) return { ok: true }

  const token = randomBytes(RESET_TOKEN_BYTES).toString("hex")
  const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS)
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires },
  })

  const base = process.env.AUTH_URL ?? "http://localhost:3000"
  const resetUrl = `${base}/reset-password/${token}`
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

  const record = await prisma.verificationToken.findUnique({ where: { token } })
  if (!record || record.expires < new Date()) {
    if (record) {
      await prisma.verificationToken
        .delete({ where: { token } })
        .catch(() => undefined)
    }
    return { ok: false, error: "Reset link is invalid or expired." }
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await prisma.$transaction([
    prisma.user.update({
      where: { email: record.identifier },
      data: { passwordHash },
    }),
    prisma.verificationToken.delete({ where: { token } }),
  ])

  try {
    await signIn("credentials", {
      email: record.identifier,
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
