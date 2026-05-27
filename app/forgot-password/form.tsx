"use client"

import { useState, useTransition } from "react"
import { requestPasswordReset } from "@/app/actions/auth"

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  const onSubmit = (fd: FormData) => {
    setError(null)
    setSent(false)
    startTransition(async () => {
      const res = await requestPasswordReset(fd)
      if (!res.ok) setError(res.error)
      else setSent(true)
    })
  }

  return (
    <form action={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        className="input"
        name="email"
        type="email"
        placeholder="you@email.com"
        required
        autoComplete="email"
      />
      <button type="submit" className="btn btn-green btn-block" disabled={isPending}>
        Send reset link
      </button>
      {sent && (
        <div
          className="card"
          style={{
            padding: 12,
            background: "var(--green-tint)",
            color: "var(--green-deep)",
            fontSize: 13,
          }}
        >
          If an account exists for that email, a reset link is on its way.
        </div>
      )}
      {error && (
        <div
          className="card"
          style={{
            padding: 12,
            background: "var(--clay-soft)",
            color: "var(--clay-deep)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}
    </form>
  )
}
