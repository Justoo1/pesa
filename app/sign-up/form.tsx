"use client"

import { useState, useTransition } from "react"
import { registerUser } from "@/app/actions/auth"

export function SignUpForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const onSubmit = (fd: FormData) => {
    setError(null)
    startTransition(async () => {
      const res = await registerUser(fd)
      if (!res.ok) setError(res.error)
    })
  }

  return (
    <form action={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        className="input"
        name="name"
        type="text"
        placeholder="Your name"
        required
        autoComplete="name"
        minLength={1}
        maxLength={60}
      />
      <input
        className="input"
        name="email"
        type="email"
        placeholder="you@email.com"
        required
        autoComplete="email"
      />
      <input
        className="input"
        name="password"
        type="password"
        placeholder="Password (8+ characters)"
        required
        autoComplete="new-password"
        minLength={8}
      />
      <button type="submit" className="btn btn-green btn-block" disabled={isPending}>
        Create account
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
