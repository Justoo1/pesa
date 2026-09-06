"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "../icons"
import { fmtMoney, fmtTxnDate } from "../format"
import { Ring, Sheet } from "../ui"
import type { Bucket, Milestone, MilestoneTransaction } from "../types"
import { fundMilestone } from "@/app/actions/projects"

function MilestoneStatement({
  ledger,
  currency,
}: {
  ledger: MilestoneTransaction[]
  currency: string
}) {
  return (
    <div className="card" style={{ padding: "4px 4px" }}>
      {ledger.length === 0 && (
        <div style={{ padding: 18, textAlign: "center" }}>
          <div className="body">No funds added toward this milestone yet.</div>
        </div>
      )}
      {ledger.map((t) => (
        <div key={t.id} className="row" style={{ borderTop: "1px solid transparent" }}>
          <div className="row-icon">
            <Icon name="flag" size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{t.note}</div>
            <div className="tiny">{fmtTxnDate(t.occurredAt)}</div>
          </div>
          <div className="num" style={{ fontWeight: 600, color: "var(--green-deep)" }}>
            +{fmtMoney(t.amount, currency)}
          </div>
        </div>
      ))}
    </div>
  )
}

export function MilestoneDetailSheet({
  open,
  onClose,
  onEdit,
  milestone,
  linkedBucket,
  ledger,
  currency,
}: {
  open: boolean
  onClose: () => void
  onEdit: () => void
  milestone: Milestone | null
  linkedBucket: Bucket | null
  ledger: MilestoneTransaction[]
  currency: string
}) {
  const router = useRouter()
  const [amount, setAmount] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, startTransition] = useTransition()
  if (!open || !milestone) return null

  const locked = milestone.status === "locked"
  const pct = milestone.targetAmount > 0 ? (milestone.currentSaved / milestone.targetAmount) * 100 : 0
  const amountNum = parseInt(amount.replace(/[^0-9]/g, ""), 10) || 0
  const canSubmit = !locked && amountNum > 0

  const submit = () => {
    if (!canSubmit) return
    setError(null)
    startTransition(async () => {
      try {
        await fundMilestone({ milestoneId: milestone.id, amount: amountNum })
        router.refresh()
        setAmount("")
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not add funds")
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
        <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
          <Icon name="close" size={18} />
        </button>
        <div className="serif" style={{ fontSize: 20, textAlign: "center", flex: 1 }}>
          {milestone.title}
        </div>
        <button className="btn btn-ghost btn-icon" onClick={onEdit} aria-label="Edit milestone">
          <Icon name="edit" size={18} />
        </button>
      </div>

      <div style={{ overflowY: "auto", flex: 1, padding: "0 4px 12px" }}>
        {milestone.funDetail && (
          <div className="body" style={{ textAlign: "center", marginBottom: 16 }}>
            {milestone.funDetail}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <Ring pct={Math.min(100, pct)} size={96} stroke={10} />
          <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>
            {fmtMoney(milestone.currentSaved, currency)}
            <span style={{ color: "var(--ink-3)", opacity: 0.6 }}>
              {" "}
              / {fmtMoney(milestone.targetAmount, currency)}
            </span>
          </div>
          <div className="tiny">{Math.round(Math.min(100, pct))}% complete</div>
        </div>

        {linkedBucket && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
            <span className="chip chip-green">
              <Icon name="tag" size={12} /> Linked to {linkedBucket.name}
            </span>
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <div className="serif" style={{ fontSize: 18, marginBottom: 10 }}>
            Activity
          </div>
          <MilestoneStatement ledger={ledger} currency={currency} />
        </div>

        <div style={{ marginTop: 24 }}>
          {locked ? (
            <div className="tiny" style={{ textAlign: "center", color: "var(--ink-3)" }}>
              Complete the previous milestone to unlock this one.
            </div>
          ) : (
            <>
              <div className="label" style={{ marginBottom: 6 }}>
                Add funds
              </div>
              <input
                className="input num"
                inputMode="numeric"
                placeholder={`${currency}0`}
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
              />
              {error && (
                <div className="tiny" style={{ color: "var(--clay-deep)", marginTop: 8 }}>
                  {error}
                </div>
              )}
              <button
                className="btn btn-green btn-block"
                style={{ marginTop: 12 }}
                disabled={!canSubmit || busy}
                onClick={submit}
              >
                <Icon name="plus" size={16} /> Add funds from bank balance
              </button>
            </>
          )}
        </div>
      </div>
    </Sheet>
  )
}
