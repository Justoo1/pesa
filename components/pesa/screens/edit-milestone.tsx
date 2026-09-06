"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "../icons"
import { Sheet } from "../ui"
import { archiveMilestone, updateMilestone } from "@/app/actions/projects"
import type { Bucket, Milestone } from "../types"

export function EditMilestoneSheet({
  open,
  onClose,
  onArchived,
  milestone,
  currency,
  buckets,
}: {
  open: boolean
  onClose: () => void
  onArchived: () => void
  milestone: Milestone | null
  currency: string
  buckets: Bucket[]
}) {
  if (!open || !milestone) return null
  return (
    <EditMilestoneContent
      onClose={onClose}
      onArchived={onArchived}
      milestone={milestone}
      currency={currency}
      buckets={buckets}
    />
  )
}

function EditMilestoneContent({
  onClose,
  onArchived,
  milestone,
  currency,
  buckets,
}: {
  onClose: () => void
  onArchived: () => void
  milestone: Milestone
  currency: string
  buckets: Bucket[]
}) {
  const router = useRouter()
  const [title, setTitle] = useState(milestone.title)
  const [funDetail, setFunDetail] = useState(milestone.funDetail)
  const [targetAmount, setTargetAmount] = useState(String(milestone.targetAmount))
  const [targetDate, setTargetDate] = useState(
    milestone.targetDate ? milestone.targetDate.slice(0, 10) : "",
  )
  const [bucketId, setBucketId] = useState(milestone.bucketId ?? "")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const targetAmountNum = parseInt(targetAmount.replace(/[^0-9]/g, ""), 10) || 0
  const canSubmit = title.trim().length > 0 && targetAmountNum > 0

  const submit = () => {
    if (!canSubmit) return
    setError(null)
    startTransition(async () => {
      try {
        await updateMilestone({
          milestoneId: milestone.id,
          title: title.trim(),
          funDetail: funDetail.trim() || undefined,
          targetAmount: targetAmountNum,
          targetDate: targetDate ? new Date(targetDate) : null,
          bucketId: bucketId || null,
        })
        router.refresh()
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save milestone.")
      }
    })
  }

  const archive = () => {
    if (
      !window.confirm(
        `Delete "${milestone.title}"? Its funding history stays on record but it will no longer show on the road.`,
      )
    )
      return
    setError(null)
    startTransition(async () => {
      try {
        await archiveMilestone({ milestoneId: milestone.id })
        router.refresh()
        onClose()
        onArchived()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not delete milestone.")
      }
    })
  }

  return (
    <Sheet open={true} onClose={onClose} height="92%">
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
          Edit milestone
        </div>
        <div style={{ width: 44 }}></div>
      </div>

      <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>
            Title
          </div>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            autoFocus
          />
        </div>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>
            Fun detail (optional)
          </div>
          <input
            className="input"
            value={funDetail}
            onChange={(e) => setFunDetail(e.target.value)}
            maxLength={140}
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
        <div>
          <div className="label" style={{ marginBottom: 6 }}>
            Linked pot (optional)
          </div>
          <select className="input" value={bucketId} onChange={(e) => setBucketId(e.target.value)}>
            <option value="">None</option>
            {buckets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
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
          Delete this milestone
        </button>
      </div>
    </Sheet>
  )
}
