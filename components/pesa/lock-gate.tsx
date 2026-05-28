"use client"

import { useEffect, useState, useTransition, type ReactNode } from "react"
import { Icon } from "./icons"
import { verifyAppPin } from "@/app/actions/settings"

const STORAGE_KEY = "pesa.unlocked"
const LOCK_EVENT = "pesa:lock-state"

export function LockGate({
  enabled,
  children,
}: {
  enabled: boolean
  children: ReactNode
}) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null)
  const [pin, setPin] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    // Read the sessionStorage flag once on mount to decide whether to show
    // the gate. setState in effect is unavoidable here because we can't read
    // sessionStorage during SSR without a hydration mismatch.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!enabled) {
      setUnlocked(true)
      return
    }
    setUnlocked(sessionStorage.getItem(STORAGE_KEY) === "1")
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [enabled])

  if (!enabled) return <>{children}</>
  if (unlocked === null) return null
  if (unlocked) return <>{children}</>

  const press = (k: string) => {
    setError(null)
    if (k === "back") {
      setPin((p) => p.slice(0, -1))
      return
    }
    setPin((p) => (p.length >= 8 ? p : p + k))
  }

  const submit = () => {
    if (pin.length < 4) {
      setError("PIN is too short.")
      return
    }
    startTransition(async () => {
      const res = await verifyAppPin({ pin })
      if (res.ok) {
        sessionStorage.setItem(STORAGE_KEY, "1")
        window.dispatchEvent(new Event(LOCK_EVENT))
        setUnlocked(true)
      } else {
        setError("Wrong PIN. Try again.")
        setPin("")
      }
    })
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "16px 20px 28px",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <div className="serif" style={{ fontSize: 30, lineHeight: 1.05 }}>
          Locked
        </div>
        <div className="body">Enter your PIN to unlock Pesa.</div>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background: i < pin.length ? "var(--ink)" : "var(--line)",
                display: pin.length > 4 && i >= pin.length + 1 ? "none" : "block",
              }}
            />
          ))}
        </div>
        {error && (
          <div className="small" style={{ color: "var(--clay-deep)" }}>
            {error}
          </div>
        )}
      </div>

      <div className="keypad" style={{ marginTop: 8 }}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"].map(
          (k, i) =>
            k === "" ? (
              <span key={`s${i}`} />
            ) : (
              <button
                key={k}
                className="key"
                type="button"
                onClick={() => press(k)}
              >
                {k === "back" ? <Icon name="back" size={22} /> : k}
              </button>
            ),
        )}
      </div>

      <button
        className="btn btn-green btn-block"
        style={{ marginTop: 10 }}
        disabled={isPending || pin.length < 4}
        onClick={submit}
      >
        Unlock
      </button>
    </div>
  )
}
