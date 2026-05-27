"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "../icons"
import { Sheet } from "../ui"
import { updateProfile } from "@/app/actions/settings"
import type { UserProfile } from "../types"

const CURRENCY_CHOICES = ["GH₵", "$", "€", "£", "₦", "₹", "KSh", "ZAR"]

export function EditProfileSheet({
  open,
  onClose,
  profile,
}: {
  open: boolean
  onClose: () => void
  profile: UserProfile
}) {
  if (!open) return null
  return <EditProfileContent onClose={onClose} profile={profile} />
}

function EditProfileContent({
  onClose,
  profile,
}: {
  onClose: () => void
  profile: UserProfile
}) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [salaryText, setSalaryText] = useState(String(profile.salary))
  const [currency, setCurrency] = useState(profile.currency)
  const [monthLabel, setMonthLabel] = useState(profile.monthLabel)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const submit = () => {
    const salary = parseInt(salaryText.replace(/[^0-9]/g, ""), 10) || 0
    setError(null)
    startTransition(async () => {
      try {
        await updateProfile({
          displayName: displayName.trim() || undefined,
          salary,
          currency: currency.trim() || undefined,
          monthLabel: monthLabel.trim() || undefined,
        })
        router.refresh()
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save profile.")
      }
    })
  }

  return (
    <Sheet open={true} onClose={onClose} height="86%">
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
          Edit profile
        </div>
        <div style={{ width: 44 }}></div>
      </div>

      <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>
            Display name
          </div>
          <input
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="What should we call you?"
            maxLength={60}
          />
        </div>

        <div>
          <div className="label" style={{ marginBottom: 6 }}>
            Monthly salary
          </div>
          <input
            className="input num"
            inputMode="numeric"
            value={salaryText}
            onChange={(e) => setSalaryText(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="0"
          />
        </div>

        <div>
          <div className="label" style={{ marginBottom: 8 }}>
            Currency
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CURRENCY_CHOICES.map((c) => {
              const active = currency === c
              return (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className="chip"
                  style={{
                    background: active ? "var(--ink)" : "rgba(33,26,18,0.06)",
                    color: active ? "var(--bg-app)" : "var(--ink)",
                  }}
                >
                  {c}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <div className="label" style={{ marginBottom: 6 }}>
            Month label
          </div>
          <input
            className="input"
            value={monthLabel}
            onChange={(e) => setMonthLabel(e.target.value)}
            placeholder="e.g. May 2026"
            maxLength={40}
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
