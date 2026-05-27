"use server"

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
