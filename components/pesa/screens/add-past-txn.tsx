"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "../icons"
import { fmtMoney } from "../format"
import { Sheet } from "../ui"
import type { BucketColor, IconName } from "../types"
import { disburse } from "@/app/actions/transactions"

export type PastTxnBucket = {
  id: string
  name: string
  color: BucketColor
  icon: IconName
}

export function AddPastTxnSheet({
  open,
  onClose,
  ym,
  buckets,
  currency,
}: {
  open: boolean
  onClose: () => void
  ym: string // "YYYY-MM"
  buckets: PastTxnBucket[]
  currency: string
}) {
  const router = useRouter()
  const [bucketId, setBucketId] = useState<string>("")
  const [amount, setAmount] = useState(0)
  const [note, setNote] = useState("")
  const [method, setMethod] = useState("MoMo")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const [year, month] = ym.split("-").map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const minDate = `${ym}-01`
  const maxDate = `${ym}-${String(daysInMonth).padStart(2, "0")}`
  // Default to the last day of the month — users adding a past entry rarely
  // know the exact day, and end-of-month is the most defensible default for
  // catching up on a forgotten paycheck.
  const [date, setDate] = useState(maxDate)

  const reset = () => {
    setBucketId("")
    setAmount(0)
    setNote("")
    setMethod("MoMo")
    setDate(maxDate)
    setError(null)
  }

  const submit = () => {
    setError(null)
    if (!bucketId) {
      setError("Pick a pot")
      return
    }
    if (amount <= 0) {
      setError("Enter an amount")
      return
    }
    const [y, m, d] = date.split("-").map(Number)
    // Noon local time avoids any DST / timezone day-rollover surprises that
    // could otherwise push the txn into the previous or next day.
    const occurredAt = new Date(y, m - 1, d, 12, 0, 0)

    startTransition(async () => {
      try {
        await disburse({ bucketId, amount, note: note || undefined, method, occurredAt })
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
        <span style={{ fontWeight: 600 }}>Add to this month</span>
        <span style={{ width: 44 }} />
      </div>

      <div style={{ overflowY: "auto", flex: 1, padding: "4px 4px 8px" }}>
        <div
          className="serif"
          style={{ fontSize: 22, lineHeight: 1.1, padding: "0 4px 12px" }}
        >
          Log a transfer you <span className="italic">forgot.</span>
        </div>

        <Label>Pot</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          {buckets.map((b) => {
            const selected = b.id === bucketId
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setBucketId(b.id)}
                className="card"
                style={{
                  appearance: "none",
                  border: selected ? "2px solid var(--ink)" : "1px solid var(--line)",
                  textAlign: "left",
                  padding: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                }}
              >
                <div className={`row-icon ${b.color}`}>
                  <Icon name={b.icon} size={16} />
                </div>
                <div className="serif" style={{ fontSize: 15, lineHeight: 1 }}>
                  {b.name}
                </div>
              </button>
            )
          })}
        </div>

        <Label>Amount</Label>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 14 }}>
          <span className="serif" style={{ fontSize: 18, color: "var(--ink-3)" }}>
            {currency}
          </span>
          <input
            className="input num"
            inputMode="numeric"
            pattern="[0-9]*"
            value={amount === 0 ? "" : amount}
            placeholder="0"
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, "")
              setAmount(v ? parseInt(v, 10) : 0)
            }}
            style={{ fontSize: 22, fontWeight: 600, flex: 1 }}
          />
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
          {pending ? "Saving…" : `Save ${amount > 0 ? fmtMoney(amount, currency) : ""}`.trim()}
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
