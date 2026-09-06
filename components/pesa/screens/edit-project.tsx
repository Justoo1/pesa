"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "../icons"
import { Sheet } from "../ui"
import { IconPicker } from "./bucket-form"
import { archiveProject, updateProject } from "@/app/actions/projects"
import type { IconName, Project } from "../types"

export function EditProjectSheet({
  open,
  onClose,
  onArchived,
  project,
  currency,
}: {
  open: boolean
  onClose: () => void
  onArchived: () => void
  project: Project | null
  currency: string
}) {
  if (!open || !project) return null
  return (
    <EditProjectContent
      onClose={onClose}
      onArchived={onArchived}
      project={project}
      currency={currency}
    />
  )
}

function EditProjectContent({
  onClose,
  onArchived,
  project,
  currency,
}: {
  onClose: () => void
  onArchived: () => void
  project: Project
  currency: string
}) {
  const router = useRouter()
  const [name, setName] = useState(project.name)
  const [targetAmount, setTargetAmount] = useState(String(project.targetAmount))
  const [targetDate, setTargetDate] = useState(project.targetDate ? project.targetDate.slice(0, 10) : "")
  const [icon, setIcon] = useState<IconName>(project.icon)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const targetAmountNum = parseInt(targetAmount.replace(/[^0-9]/g, ""), 10) || 0
  const canSubmit = name.trim().length > 0 && targetAmountNum > 0

  const submit = () => {
    if (!canSubmit) return
    setError(null)
    startTransition(async () => {
      try {
        await updateProject({
          projectId: project.id,
          name: name.trim(),
          targetAmount: targetAmountNum,
          targetDate: targetDate ? new Date(targetDate) : null,
          icon,
        })
        router.refresh()
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save project.")
      }
    })
  }

  const archive = () => {
    if (
      !window.confirm(
        `Delete "${project.name}"? Its milestones and their funding history stay on record but will no longer be shown.`,
      )
    )
      return
    setError(null)
    startTransition(async () => {
      try {
        await archiveProject({ projectId: project.id })
        router.refresh()
        onClose()
        onArchived()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not delete project.")
      }
    })
  }

  return (
    <Sheet open={true} onClose={onClose} height="88%">
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
          Edit project
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

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
        <button className="btn btn-green btn-block" disabled={!canSubmit || isPending} onClick={submit}>
          <Icon name="check" size={16} /> Save changes
        </button>
        <button
          className="btn btn-soft btn-block"
          onClick={archive}
          disabled={isPending}
          style={{ color: "var(--clay-deep)" }}
        >
          Delete this project
        </button>
      </div>
    </Sheet>
  )
}
