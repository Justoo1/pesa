"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "../icons"
import { Sheet } from "../ui"
import { setRoundUpsPrefs } from "@/app/actions/settings"

type Props = {
  open: boolean
  onClose: () => void
  initialEnabled: boolean
  initialStep: number
  currency: string
  hasSavingsBucket: boolean
}

export function RoundUpsSheet(props: Props) {
  if (!props.open) return null
  return <Content {...props} />
}

function Content({
  onClose,
  initialEnabled,
  initialStep,
  currency,
  hasSavingsBucket,
}: Props) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(initialEnabled && hasSavingsBucket)
  const [step, setStep] = useState<number>(initialStep > 0 ? initialStep : 50)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const submit = () => {
    setError(null)
    startTransition(async () => {
      try {
        await setRoundUpsPrefs({
          enabled: hasSavingsBucket ? enabled : false,
          step,
        })
        router.refresh()
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save.")
      }
    })
  }

  return (
    <Sheet open={true} onClose={onClose} height="70%">
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
          Round-ups
        </div>
        <div style={{ width: 44 }}></div>
      </div>

      <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="body" style={{ fontSize: 13, color: "var(--ink-2)" }}>
          When you disburse to a non-savings pot, the remainder up to the next
          step is auto-saved into your first <em>Future</em> pot.
        </div>

        {!hasSavingsBucket && (
          <div
            className="card"
            style={{
              padding: 12,
              background: "var(--clay-soft)",
              color: "var(--clay-deep)",
              fontSize: 13,
            }}
          >
            You don&apos;t have a <strong>Future</strong>-kind pot yet, so there
            is nowhere to route round-ups. Create one (e.g. &quot;Savings&quot;)
            and come back.
          </div>
        )}

        <label
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            background: "var(--bg-card)",
            borderRadius: 14,
            border: "1px solid var(--line)",
            cursor: hasSavingsBucket ? "pointer" : "not-allowed",
            opacity: hasSavingsBucket ? 1 : 0.5,
          }}
        >
          <span style={{ fontWeight: 600 }}>Enable round-ups</span>
          <input
            type="checkbox"
            checked={enabled}
            disabled={!hasSavingsBucket}
            onChange={(e) => setEnabled(e.target.checked)}
          />
        </label>

        <div>
          <div className="label" style={{ marginBottom: 6 }}>
            Round up to nearest ({currency})
          </div>
          <input
            className="input num"
            inputMode="numeric"
            value={step}
            onChange={(e) => {
              const n = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10)
              if (!Number.isFinite(n)) setStep(1)
              else setStep(Math.min(10000, Math.max(1, n)))
            }}
          />
          <div
            className="tiny"
            style={{ marginTop: 6, color: "var(--ink-3)" }}
          >
            e.g. {currency} {step} — a {currency} 123 transfer routes{" "}
            {currency} {step - (123 % step || step)} to savings.
          </div>
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
