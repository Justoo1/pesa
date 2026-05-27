import Link from "next/link"
import { AuthCard } from "@/components/pesa/auth-card"
import { SignInForms } from "./forms"

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  Configuration:
    "Auth is missing config. Check AUTH_SECRET / AUTH_RESEND_KEY / AUTH_GOOGLE_* in your env.",
  AccessDenied: "Access denied.",
  Verification: "The magic link is expired or already used.",
  OAuthAccountNotLinked:
    "An account with this email already exists with a different sign-in method.",
  CredentialsSignin: "Wrong email or password.",
  Default: "Something went wrong. Try again.",
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const errorMessage = error
    ? (AUTH_ERROR_MESSAGES[error] ?? AUTH_ERROR_MESSAGES.Default)
    : null

  return (
    <AuthCard
      title="Welcome back."
      subtitle="Sign in to find your pots where you left them."
    >
      {errorMessage && (
        <div
          className="card"
          style={{
            padding: 12,
            background: "var(--clay-soft)",
            color: "var(--clay-deep)",
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          {errorMessage}
        </div>
      )}
      <SignInForms />
      <div
        className="small"
        style={{ textAlign: "center", marginTop: 18, color: "var(--ink-3)" }}
      >
        New here?{" "}
        <Link
          href="/sign-up"
          style={{ color: "var(--ink)", fontWeight: 600, textDecoration: "underline" }}
        >
          Create an account
        </Link>
      </div>
    </AuthCard>
  )
}
