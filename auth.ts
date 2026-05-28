import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import Resend from "next-auth/providers/resend"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import authConfig from "./auth.config"

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
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null
        const email = String(creds.email).toLowerCase()
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user?.passwordHash) return null
        const ok = await bcrypt.compare(String(creds.password), user.passwordHash)
        if (!ok) return null
        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) token.id = user.id
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
