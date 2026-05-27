import Link from "next/link"
import { AuthCard } from "@/components/pesa/auth-card"
import { ForgotPasswordForm } from "./form"

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot password?"
      subtitle="Enter your email and we'll send a reset link."
    >
      <ForgotPasswordForm />
      <div
        className="small"
        style={{ textAlign: "center", marginTop: 18, color: "var(--ink-3)" }}
      >
        Remembered it?{" "}
        <Link
          href="/sign-in"
          style={{ color: "var(--ink)", fontWeight: 600, textDecoration: "underline" }}
        >
          Back to sign in
        </Link>
      </div>
    </AuthCard>
  )
}
