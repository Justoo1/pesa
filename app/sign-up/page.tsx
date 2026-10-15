import Link from "next/link"
import { AuthCard } from "@/components/pesa/auth-card"
import { SignUpForm } from "./form"

export default function SignUpPage() {
  return (
    <AuthCard
      title="Start your first pot."
      subtitle="Create an account and we'll seed you with a sensible set of pots to begin."
    >
      <SignUpForm />
      <p className="tiny" style={{ textAlign: "center", marginTop: 12 }}>
        By creating an account you agree to the{" "}
        <Link href="/terms" style={{ textDecoration: "underline" }}>
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" style={{ textDecoration: "underline" }}>
          Privacy Policy
        </Link>
        .
      </p>
      <div
        className="small"
        style={{ textAlign: "center", marginTop: 18, color: "var(--ink-3)" }}
      >
        Already have an account?{" "}
        <Link
          href="/sign-in"
          style={{ color: "var(--ink)", fontWeight: 600, textDecoration: "underline" }}
        >
          Sign in
        </Link>
      </div>
    </AuthCard>
  )
}
