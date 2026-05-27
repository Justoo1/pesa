"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  signInWithCredentials,
  signInWithEmail,
  signInWithGoogle,
} from "@/app/actions/auth"

export function SignInForms() {
  const [error, setError] = useState<string | null>(null)
  const [magicSent, setMagicSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  const onCredentials = (fd: FormData) => {
    setError(null)
    startTransition(async () => {
      const res = await signInWithCredentials(fd)
      if (!res.ok) setError(res.error)
    })
  }

  const onEmail = (fd: FormData) => {
    setError(null)
    setMagicSent(false)
    startTransition(async () => {
      const res = await signInWithEmail(fd)
      if (!res.ok) setError(res.error)
      else setMagicSent(true)
    })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <form action={signInWithGoogle}>
        <button
          type="submit"
          className="btn btn-soft btn-block"
          disabled={isPending}
        >
          Continue with Google
        </button>
      </form>

      <Divider label="or with email" />

      <form action={onCredentials} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
          placeholder="Password"
          required
          autoComplete="current-password"
        />
        <button type="submit" className="btn btn-green btn-block" disabled={isPending}>
          Sign in
        </button>
        <div style={{ textAlign: "center", marginTop: 2 }}>
          <Link
            href="/forgot-password"
            className="small"
            style={{ color: "var(--ink-2)", textDecoration: "underline" }}
          >
            Forgot password?
          </Link>
        </div>
      </form>

      <Divider label="or magic link" />

      <form action={onEmail} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          className="input"
          name="email"
          type="email"
          placeholder="you@email.com"
          required
          autoComplete="email"
        />
        <button type="submit" className="btn btn-soft btn-block" disabled={isPending}>
          Email me a magic link
        </button>
      </form>

      {magicSent && (
        <div
          className="card"
          style={{
            padding: 12,
            background: "var(--green-tint)",
            color: "var(--green-deep)",
            fontSize: 13,
          }}
        >
          Check your email for the sign-in link.
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
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: "var(--ink-3)",
        fontSize: 11,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontWeight: 600,
      }}
    >
      <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
      <span>{label}</span>
      <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
    </div>
  )
}
