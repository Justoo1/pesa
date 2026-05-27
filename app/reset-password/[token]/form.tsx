"use client"

import { useState, useTransition } from "react"
import { resetPassword } from "@/app/actions/auth"

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const onSubmit = (fd: FormData) => {
    setError(null)
    fd.set("token", token)
    startTransition(async () => {
      const res = await resetPassword(fd)
      if (!res.ok) setError(res.error)
    })
  }

  return (
    <form action={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        className="input"
        name="password"
        type="password"
        placeholder="New password"
        required
        autoComplete="new-password"
        minLength={8}
      />
      <button type="submit" className="btn btn-green btn-block" disabled={isPending}>
        Reset password
      </button>
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
