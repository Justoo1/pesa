import Link from "next/link"
import { AuthCard } from "@/components/pesa/auth-card"
import { ResetPasswordForm } from "./form"

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return (
    <AuthCard
      title="Choose a new password."
      subtitle="At least 8 characters. You'll be signed in after."
    >
      <ResetPasswordForm token={token} />
      <div
        className="small"
        style={{ textAlign: "center", marginTop: 18, color: "var(--ink-3)" }}
      >
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
