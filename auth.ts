import NextAuth, { CredentialsSignin } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import Resend from "next-auth/providers/resend"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import {
  BCRYPT_COST,
  claimInboxOwnership,
  verifyPasswordConstantTime,
} from "@/lib/account-security"
import { RateLimitError, enforceRateLimits, limits, resetRateLimit } from "@/lib/rate-limit"
import authConfig from "./auth.config"

/** Surfaced to the sign-in form as `error.code === "rate_limited"`. */
class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited"
}

function ipOf(request: Request | undefined): string {
  const h = request?.headers
  return h?.get("x-forwarded-for")?.split(",")[0]?.trim() || h?.get("x-real-ip") || "unknown"
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    ...authConfig.providers,
    Resend({
      from: (() => {
        const from = process.env.AUTH_EMAIL_FROM?.trim()
        if (!from) {
          if (process.env.NODE_ENV === "production") {
            throw new Error("AUTH_EMAIL_FROM is required in production")
          }
          return "Pesa <onboarding@resend.dev>"
        }
        return from
      })(),
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds, request) {
        if (!creds?.email || !creds?.password) return null
        const email = String(creds.email).toLowerCase()
        const password = String(creds.password)
        try {
          await enforceRateLimits([limits.loginByEmail(email), limits.loginByIp(ipOf(request))])
        } catch (e) {
          if (e instanceof RateLimitError) throw new RateLimitedSignin()
          throw e
        }
        const user = await prisma.user.findUnique({ where: { email } })
        // Always run bcrypt so a missing account takes as long as a wrong password.
        if (!(await verifyPasswordConstantTime(password, user?.passwordHash)) || !user) return null

        await resetRateLimit(limits.loginByEmail(email).key)
        // Upgrade hashes made at a lower cost the first time we see the password.
        if (bcrypt.getRounds(user.passwordHash!) < BCRYPT_COST) {
          await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: await bcrypt.hash(password, BCRYPT_COST) },
          })
        }
        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, email }) {
      // Signing in through the inbox (magic link) or Google proves the email
      // is theirs: wipe any password set by someone who never proved it and
      // end older sessions — before this session's JWT is minted, so the new
      // session survives. (`email.verificationRequest` is the "send link"
      // step, not the sign-in itself.)
      const provesInbox = account?.provider === "resend" || account?.provider === "google"
      if (provesInbox && !email?.verificationRequest && user?.id) {
        const exists = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } })
        if (exists) await claimInboxOwnership(user.id)
      }
      return true
    },
    async jwt({ token, user }) {
      if (user?.id) {
        // Fresh sign-in: stamp the session with the user's current version.
        const row = await prisma.user.findUnique({
          where: { id: user.id },
          select: { sessionVersion: true },
        })
        token.id = user.id
        token.sv = row?.sessionVersion ?? 0
        return token
      }
      if (!token.id) return token
      // Every later request: a password reset or takeover guard bumps the
      // version, which ends all sessions minted before it.
      const row = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { sessionVersion: true },
      })
      if (!row || row.sessionVersion !== (token.sv ?? 0)) return null
      return token
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return
      const { seedNewUser } = await import("@/lib/seed")
      await seedNewUser(user.id)
    },
  },
})
