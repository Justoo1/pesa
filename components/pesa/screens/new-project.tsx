"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "../icons"
import { Sheet } from "../ui"
import { IconPicker } from "./bucket-form"
import type { IconName } from "../types"
import { createProject } from "@/app/actions/projects"

export function NewProjectSheet({
  open,
  onClose,
  currency,
}: {
  open: boolean
  onClose: () => void
  currency: string
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [icon, setIcon] = useState<IconName>("home")
  const [error, setError] = useState<string | null>(null)
  const [busy, startTransition] = useTransition()
  if (!open) return null

  const targetAmountNum = parseInt(targetAmount.replace(/[^0-9]/g, ""), 10) || 0
  const canSubmit = name.trim().length > 0 && targetAmountNum > 0

  const submit = () => {
    if (!canSubmit) return
    setError(null)
    startTransition(async () => {
      try {
        await createProject({
          name: name.trim(),
          targetAmount: targetAmountNum,
          targetDate: targetDate ? new Date(targetDate) : undefined,
          icon,
        })
        router.refresh()
        setName("")
        setTargetAmount("")
        setTargetDate("")
        setIcon("home")
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create project")
      }
    })
  }

  return (
    <Sheet open={true} onClose={onClose} height="80%">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 4px 12px",
        }}
      >
        <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
          <Icon name="close" size={18} />
        </button>
        <div className="serif" style={{ fontSize: 22 }}>
          New project
        </div>
        <div style={{ width: 44 }}></div>
      </div>

      <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>
            Goal name
          </div>
          <input
            className="input"
            placeholder="e.g. My 3-Bedroom House"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            autoFocus
          />
        </div>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>
            Target amount
          </div>
          <input
            className="input num"
            inputMode="numeric"
            placeholder={`${currency}0`}
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value.replace(/[^0-9]/g, ""))}
          />
        </div>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>
            Target date (optional)
          </div>
          <input
            className="input"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>
        <IconPicker value={icon} onChange={setIcon} />
        {error && (
          <div className="tiny" style={{ color: "var(--clay-deep)" }}>
            {error}
          </div>
        )}
      </div>

      <button
        className="btn btn-green btn-block"
        style={{ marginTop: 20 }}
        disabled={!canSubmit || busy}
        onClick={submit}
      >
        <Icon name="plus" size={16} /> Start this goal
      </button>
    </Sheet>
  )
}
