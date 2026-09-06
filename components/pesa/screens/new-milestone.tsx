"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "../icons"
import { Sheet } from "../ui"
import type { Bucket } from "../types"
import { createMilestone } from "@/app/actions/projects"

export function NewMilestoneSheet({
  open,
  onClose,
  projectId,
  currency,
  buckets,
}: {
  open: boolean
  onClose: () => void
  projectId: string
  currency: string
  buckets: Bucket[]
}) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [funDetail, setFunDetail] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [bucketId, setBucketId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, startTransition] = useTransition()
  if (!open) return null

  const targetAmountNum = parseInt(targetAmount.replace(/[^0-9]/g, ""), 10) || 0
  const canSubmit = title.trim().length > 0 && targetAmountNum > 0

  const submit = () => {
    if (!canSubmit) return
    setError(null)
    startTransition(async () => {
      try {
        await createMilestone({
          projectId,
          title: title.trim(),
          funDetail: funDetail.trim() || undefined,
          targetAmount: targetAmountNum,
          targetDate: targetDate ? new Date(targetDate) : undefined,
          bucketId: bucketId || undefined,
        })
        router.refresh()
        setTitle("")
        setFunDetail("")
        setTargetAmount("")
        setTargetDate("")
        setBucketId("")
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not add milestone")
      }
    })
  }

  return (
    <Sheet open={true} onClose={onClose} height="85%">
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
          New milestone
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
            placeholder="e.g. Land Acquisition"
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
            placeholder="e.g. Securing your patch of earth!"
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
        {buckets.length > 0 && (
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
        )}
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
        <Icon name="plus" size={16} /> Add milestone
      </button>
    </Sheet>
  )
}
