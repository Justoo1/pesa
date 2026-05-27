"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "../icons"
import { Sheet } from "../ui"
import { setPaydayPrefs } from "@/app/actions/settings"

export function PaydayPrefsSheet({
  open,
  onClose,
  initialEnabled,
  initialDay,
}: {
  open: boolean
  onClose: () => void
  initialEnabled: boolean
  initialDay: number | null
}) {
  if (!open) return null
  return (
    <PaydayPrefsContent
      onClose={onClose}
      initialEnabled={initialEnabled}
      initialDay={initialDay}
    />
  )
}

function PaydayPrefsContent({
  onClose,
  initialEnabled,
  initialDay,
}: {
  onClose: () => void
  initialEnabled: boolean
  initialDay: number | null
}) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [day, setDay] = useState<number>(initialDay ?? 28)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const submit = () => {
    setError(null)
    startTransition(async () => {
      try {
        await setPaydayPrefs({ enabled, dayOfMonth: enabled ? day : undefined })
        router.refresh()
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save.")
      }
    })
  }

  return (
    <Sheet open={true} onClose={onClose} height="56%">
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
          Payday reminders
        </div>
        <div style={{ width: 44 }}></div>
      </div>

      <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="body">
          We&apos;ll email you on payday to nudge you to disburse. Turn this off any
          time.
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            background: "var(--bg-card)",
            borderRadius: 14,
            border: "1px solid var(--line)",
            cursor: "pointer",
          }}
        >
          <span style={{ fontWeight: 600 }}>Enable reminders</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
        </label>

        {enabled && (
          <div>
            <div className="label" style={{ marginBottom: 6 }}>
              Day of the month (1–31)
            </div>
            <input
              className="input num"
              inputMode="numeric"
              value={day}
              onChange={(e) => {
                const n = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10)
                if (!Number.isFinite(n)) setDay(1)
                else setDay(Math.min(31, Math.max(1, n)))
              }}
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
        <Icon name="check" size={16} /> Save
      </button>
    </Sheet>
  )
}
