"use client"

import { useState, useTransition } from "react"
import { Icon } from "../icons"
import { Sheet } from "../ui"
import { deleteAccount } from "@/app/actions/settings"

export function DeleteAccountSheet({
  open,
  onClose,
  email,
}: {
  open: boolean
  onClose: () => void
  email: string | null
}) {
  if (!open) return null
  return <DeleteAccountContent onClose={onClose} email={email} />
}

function DeleteAccountContent({
  onClose,
  email,
}: {
  onClose: () => void
  email: string | null
}) {
  const [confirmEmail, setConfirmEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const submit = () => {
    if (!email) {
      setError("No email on this account — can't auto-delete; contact support.")
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const res = await deleteAccount({ confirmEmail })
        if (!res.ok) setError(res.error ?? "Could not delete account.")
        // On success, deleteAccount calls signOut() which redirects.
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not delete account.")
      }
    })
  }

  return (
    <Sheet open={true} onClose={onClose} height="62%">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 4px 12px",
        }}
      >
        <button
          className="btn btn-ghost btn-icon"
          onClick={onClose}
          aria-label="Close"
        >
          <Icon name="close" size={18} />
        </button>
        <div className="serif" style={{ fontSize: 22, color: "var(--clay-deep)" }}>
          Delete account
        </div>
        <div style={{ width: 44 }}></div>
      </div>

      <div
        style={{
          padding: "0 4px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          className="card"
          style={{
            padding: 14,
            background: "var(--clay-soft)",
            color: "var(--clay-deep)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            This is permanent.
          </div>
          <div className="body" style={{ color: "var(--clay-deep)" }}>
            All your pots and transactions will be deleted. There&apos;s no undo.
          </div>
        </div>

        <div>
          <div className="label" style={{ marginBottom: 6 }}>
            Type your email to confirm
          </div>
          <input
            className="input"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            placeholder={email ?? "your email"}
            autoComplete="off"
          />
        </div>

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

      <button
        className="btn btn-clay btn-block"
        style={{ marginTop: 20 }}
        disabled={isPending || !confirmEmail}
        onClick={submit}
      >
        Delete forever
      </button>
    </Sheet>
  )
}
