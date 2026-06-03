"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "../icons"
import { fmtMoney } from "../format"
import { Sheet } from "../ui"
import type { BucketColor, IconName } from "../types"
import { disburseMany } from "@/app/actions/transactions"

export type PastTxnBucket = {
  id: string
  name: string
  color: BucketColor
  icon: IconName
  target: number
}

export function AddPastTxnSheet({
  open,
  onClose,
  ym,
  buckets,
  currency,
  filledByMonth,
}: {
  open: boolean
  onClose: () => void
  // When omitted, the sheet shows a month picker so the user can add to any
  // past month (used from the /months index page). When provided, it's locked
  // to that month (used from /months/[ym]).
  ym?: string
  buckets: PastTxnBucket[]
  currency: string
  // { "YYYY-MM": { bucketId: filledAmount } } — used to grey out pots that have
  // already hit their target for the month being edited.
  filledByMonth?: Record<string, Record<string, number>>
}) {
  const router = useRouter()
  // bucketId -> amount for every pot the user has toggled on.
  const [selected, setSelected] = useState<Record<string, number>>({})
  const [note, setNote] = useState("")
  const [method, setMethod] = useState("MoMo")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Build the last 12 months (current month last so past months come first
  // when ym is unset).
  const now = new Date()
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleString("en-US", { month: "long", year: "numeric" })
    return { value: v, label }
  })
  const lockedYm = ym
  const [selectedYm, setSelectedYm] = useState<string>(
    lockedYm ?? monthOptions[1]?.value ?? monthOptions[0].value,
  )
  const activeYm = lockedYm ?? selectedYm

  const [year, month] = activeYm.split("-").map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const minDate = `${activeYm}-01`
  const maxDate = `${activeYm}-${String(daysInMonth).padStart(2, "0")}`
  // Default to the last day of the month — users adding a past entry rarely
  // know the exact day, and end-of-month is the most defensible default for
  // catching up on a forgotten paycheck.
  const [date, setDate] = useState(maxDate)

  // When the target month changes, re-anchor the date into that month (so
  // picking "March" after "April" doesn't leave an out-of-range April date)
  // and clear the selection (a pot full in April may not be full in March).
  // Adjusting state during render is React's recommended pattern here — it
  // avoids an extra effect pass and a flash of stale UI.
  const [prevYm, setPrevYm] = useState(activeYm)
  if (prevYm !== activeYm) {
    setPrevYm(activeYm)
    setDate(maxDate)
    setSelected({})
  }

  const filledMap = filledByMonth?.[activeYm] ?? {}
  const fillState = (b: PastTxnBucket) => {
    const filled = filledMap[b.id] ?? 0
    const isFull = b.target > 0 && filled >= b.target
    const remaining = Math.max(0, b.target - filled)
    // Suggested amount when toggling on: whatever's left to reach target, or
    // the full target for pots with nothing logged / no remaining shortfall.
    const suggested = remaining > 0 ? remaining : b.target
    return { filled, isFull, remaining, suggested }
  }

  const toggle = (b: PastTxnBucket) => {
    setSelected((prev) => {
      if (b.id in prev) {
        const next = { ...prev }
        delete next[b.id]
        return next
      }
      return { ...prev, [b.id]: fillState(b).suggested }
    })
  }

  const setAmountFor = (id: string, raw: string) => {
    const v = raw.replace(/[^0-9]/g, "")
    setSelected((prev) => ({ ...prev, [id]: v ? parseInt(v, 10) : 0 }))
  }

  const fillableBuckets = buckets.filter((b) => !fillState(b).isFull)

  const fillAll = () => {
    const next: Record<string, number> = {}
    for (const b of fillableBuckets) next[b.id] = fillState(b).suggested
    setSelected(next)
  }

  const entries = Object.entries(selected)
    .filter(([, a]) => a > 0)
    .map(([bucketId, amount]) => ({ bucketId, amount }))
  const total = entries.reduce((s, e) => s + e.amount, 0)

  const reset = () => {
    setSelected({})
    setNote("")
    setMethod("MoMo")
    setDate(maxDate)
    setError(null)
    if (!lockedYm) setSelectedYm(monthOptions[1]?.value ?? monthOptions[0].value)
  }

  const submit = () => {
    setError(null)
    if (entries.length === 0) {
      setError("Pick at least one pot")
      return
    }
    const [y, m, d] = date.split("-").map(Number)
    // Noon local time avoids any DST / timezone day-rollover surprises that
    // could otherwise push the txn into the previous or next day.
    const occurredAt = new Date(y, m - 1, d, 12, 0, 0)

    startTransition(async () => {
      try {
        await disburseMany({ entries, note: note || undefined, method, occurredAt })
        reset()
        onClose()
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong")
      }
    })
  }

  return (
    <Sheet open={open} onClose={onClose} height="86%">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 4px 8px",
        }}
      >
        <button
          className="btn btn-ghost btn-icon"
          onClick={onClose}
          aria-label="Close"
        >
          <Icon name="close" size={18} />
        </button>
        <span style={{ fontWeight: 600 }}>
          {lockedYm ? "Add to this month" : "Add to a past month"}
        </span>
        <span style={{ width: 44 }} />
      </div>

      <div style={{ overflowY: "auto", flex: 1, padding: "4px 4px 8px" }}>
        <div
          className="serif"
          style={{ fontSize: 22, lineHeight: 1.1, padding: "0 4px 12px" }}
        >
          Log transfers you <span className="italic">forgot.</span>
        </div>

        {!lockedYm && (
          <>
            <Label>Month</Label>
            <select
              className="input"
              value={selectedYm}
              onChange={(e) => setSelectedYm(e.target.value)}
              style={{ marginBottom: 14 }}
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <Label>Pots</Label>
          <div style={{ display: "flex", gap: 6 }}>
            {entries.length > 0 && (
              <button
                type="button"
                className="chip"
                onClick={() => setSelected({})}
                style={{ background: "rgba(33,26,18,0.06)", color: "var(--ink)" }}
              >
                Clear
              </button>
            )}
            {fillableBuckets.length > 0 && (
              <button
                type="button"
                className="chip"
                onClick={fillAll}
                style={{ background: "var(--ink)", color: "var(--bg-app)" }}
              >
                Fill all to target
              </button>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          {buckets.map((b) => {
            const { filled, isFull } = fillState(b)
            const isSelected = b.id in selected
            const amt = selected[b.id] ?? 0
            const meta = isFull
              ? `Filled · ${fmtMoney(filled, currency)}`
              : filled > 0
                ? `${fmtMoney(filled, currency)} of ${fmtMoney(b.target, currency)}`
                : b.target > 0
                  ? `Target ${fmtMoney(b.target, currency)}`
                  : "No target"
            return (
              <div
                key={b.id}
                className="card"
                style={{
                  border: isSelected
                    ? "2px solid var(--ink)"
                    : "1px solid var(--line)",
                  padding: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                  opacity: isFull ? 0.55 : 1,
                }}
              >
                <button
                  type="button"
                  disabled={isFull}
                  onClick={() => toggle(b)}
                  style={{
                    appearance: "none",
                    border: 0,
                    background: "transparent",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flex: 1,
                    minWidth: 0,
                    textAlign: "left",
                    padding: 4,
                    cursor: isFull ? "default" : "pointer",
                  }}
                >
                  <div className={`row-icon ${b.color}`}>
                    <Icon name={b.icon} size={16} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="serif" style={{ fontSize: 15, lineHeight: 1.1 }}>
                      {b.name}
                    </div>
                    <div className="tiny" style={{ opacity: 0.7, marginTop: 3 }}>
                      {meta}
                    </div>
                  </div>
                </button>

                {isFull ? (
                  <span
                    className="tiny"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontWeight: 700,
                      color: "var(--green-deep)",
                      paddingRight: 6,
                    }}
                  >
                    <Icon name="check" size={13} /> Full
                  </span>
                ) : isSelected ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 4,
                      width: 116,
                    }}
                  >
                    <span
                      className="serif"
                      style={{ fontSize: 13, color: "var(--ink-3)" }}
                    >
                      {currency}
                    </span>
                    <input
                      className="input num"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={amt === 0 ? "" : amt}
                      placeholder="0"
                      onChange={(e) => setAmountFor(b.id, e.target.value)}
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        width: "100%",
                        padding: "6px 8px",
                      }}
                    />
                  </div>
                ) : (
                  <span
                    className="tiny"
                    style={{ color: "var(--ink-3)", paddingRight: 8 }}
                  >
                    Tap to add
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <Label>Date</Label>
        <input
          className="input"
          type="date"
          min={minDate}
          max={maxDate}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ marginBottom: 14 }}
        />

        <Label>Method</Label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {["MoMo", "Transfer", "Card", "Cash"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className="chip"
              style={{
                background: method === m ? "var(--ink)" : "rgba(33,26,18,0.06)",
                color: method === m ? "var(--bg-app)" : "var(--ink)",
              }}
            >
              {m}
            </button>
          ))}
        </div>

        <Label>Note (optional)</Label>
        <input
          className="input"
          placeholder="What was it for?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ marginBottom: 14 }}
        />

        {error && (
          <div className="tiny" style={{ color: "var(--clay-deep)", marginBottom: 10 }}>
            {error}
          </div>
        )}

        <button
          className="btn btn-green btn-block"
          onClick={submit}
          disabled={pending}
        >
          <Icon name="send" size={16} />{" "}
          {pending
            ? "Saving…"
            : entries.length > 0
              ? `Add ${entries.length} transfer${entries.length === 1 ? "" : "s"} · ${fmtMoney(total, currency)}`
              : "Add transfers"}
        </button>
      </div>
    </Sheet>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="tiny"
      style={{
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        marginBottom: 6,
        opacity: 0.7,
      }}
    >
      {children}
    </div>
  )
}
