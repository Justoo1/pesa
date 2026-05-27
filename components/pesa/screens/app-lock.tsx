"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "../icons"
import { Sheet } from "../ui"
import { disableAppLock, setAppLock } from "@/app/actions/settings"

export function AppLockSheet({
  open,
  onClose,
  enabled,
}: {
  open: boolean
  onClose: () => void
  enabled: boolean
}) {
  if (!open) return null
  return <AppLockContent onClose={onClose} enabled={enabled} />
}

function AppLockContent({
  onClose,
  enabled,
}: {
  onClose: () => void
  enabled: boolean
}) {
  const router = useRouter()
  const [pin, setPin] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const submit = () => {
    setError(null)
    if (enabled) {
      if (pin.length < 4) {
        setError("Enter your current PIN.")
        return
      }
      startTransition(async () => {
        const res = await disableAppLock({ pin })
        if (!res.ok) {
          setError(res.error ?? "Could not disable lock.")
          return
        }
        router.refresh()
        onClose()
      })
      return
    }
    // Setting a new PIN
    if (!/^\d{4,8}$/.test(pin)) {
      setError("PIN must be 4–8 digits.")
      return
    }
    if (pin !== confirm) {
      setError("PINs don't match.")
      return
    }
    startTransition(async () => {
      try {
        await setAppLock({ pin })
        sessionStorage.setItem("pesa.unlocked", "1")
        router.refresh()
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not set PIN.")
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
        <div className="serif" style={{ fontSize: 22 }}>
          {enabled ? "Disable PIN lock" : "Set a PIN lock"}
        </div>
        <div style={{ width: 44 }}></div>
      </div>

      <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="body">
          {enabled
            ? "Enter your current PIN to turn off App Lock."
            : "Choose a 4–8 digit PIN. You'll enter it next time you open Pesa."}
        </div>

        <div>
          <div className="label" style={{ marginBottom: 6 }}>
            {enabled ? "Current PIN" : "New PIN"}
          </div>
          <input
            className="input num"
            inputMode="numeric"
            type="password"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
            autoFocus
          />
        </div>

        {!enabled && (
          <div>
            <div className="label" style={{ marginBottom: 6 }}>
              Confirm PIN
            </div>
            <input
              className="input num"
              inputMode="numeric"
              type="password"
              maxLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/[^0-9]/g, ""))}
            />
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

      <button
        className="btn btn-green btn-block"
        style={{ marginTop: 20 }}
        disabled={isPending}
        onClick={submit}
      >
        <Icon name="check" size={16} /> {enabled ? "Disable lock" : "Set PIN"}
      </button>
    </Sheet>
  )
}
