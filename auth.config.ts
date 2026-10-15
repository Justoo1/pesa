import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

// Edge-safe slice of the Auth.js config used by `proxy.ts`.
// Providers that need a database adapter (Resend email, Credentials) live in
// `auth.ts`, not here — including them here would force the adapter on Edge
// and break the proxy.
const PUBLIC_PATHS = new Set(["/privacy", "/terms", "/support", "/delete-account"])

export default {
  providers: [Google],
  pages: { signIn: "/sign-in", error: "/sign-in" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      // Store listings link here, so they must load without an account.
      if (PUBLIC_PATHS.has(nextUrl.pathname)) return true
      const isOnAuthPath =
        nextUrl.pathname.startsWith("/sign-in") ||
        nextUrl.pathname.startsWith("/sign-up")
      if (isOnAuthPath) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl))
        return true
      }
      return isLoggedIn
    },
  },
} satisfies NextAuthConfig
