"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "../icons"
import { fmtMoney } from "../format"
import { spend as spendAction } from "@/app/actions/transactions"
import type { Bucket } from "../types"

function parseAmount(text: string): number {
  // Find the first plausible amount in the shared text. We accept "GH₵ 30",
  // "30.50", "1,200" — strip the currency/letters first.
  const m = text.match(/(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/)
  if (!m) return 0
  const cleaned = m[1].replace(/[,\s]/g, "")
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return 0
  return Math.round(n)
}

function parseNote(text: string): string {
  // Drop leading currency-+ number so the note reads as the description rather
  // than echoing the parsed amount.
  return text.replace(/^[^\d]*\d[\d,.\s]*\s*/, "").trim() || text
}

export function ShareLanding({
  sharedText,
  buckets,
  currency,
}: {
  sharedText: string
  buckets: Bucket[]
  currency: string
}) {
  const router = useRouter()
  const [bucketId, setBucketId] = useState<string | null>(null)
  const initialAmount = useMemo(() => parseAmount(sharedText), [sharedText])
  const initialNote = useMemo(() => parseNote(sharedText), [sharedText])
  const [amount, setAmount] = useState(initialAmount)
  const [note, setNote] = useState(initialNote)
  const [method, setMethod] = useState("Cash")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const spendable = buckets.filter((b) => b.allocated - b.spent > 0)
  const bucket = bucketId ? buckets.find((b) => b.id === bucketId) : null
  const available = bucket ? Math.max(0, bucket.allocated - bucket.spent) : 0

  const press = (k: string) => {
    setError(null)
    setAmount((prev) => {
      if (k === "back") return Math.floor(prev / 10)
      if (k === "00") return prev * 100
      return prev * 10 + parseInt(k, 10)
    })
  }

  const submit = () => {
    if (!bucketId) return
    if (amount <= 0) {
      setError("Enter an amount above zero.")
      return
    }
    if (amount > available) {
      setError(`Only ${fmtMoney(available, currency)} left in ${bucket?.name}.`)
      return
    }
    startTransition(async () => {
      try {
        await spendAction({
          bucketId,
          amount,
          note: note.trim() || undefined,
          method,
        })
        router.replace("/")
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong")
      }
    })
  }

  return (
    <div className="stage">
      <div className="device">
        <div className="device-screen">
          <div className="statusbar">
            <span style={{ fontSize: 14, fontWeight: 600 }}>Log a spend</span>
            <button
              type="button"
              onClick={() => router.replace("/")}
              aria-label="Cancel"
              style={{
                background: "transparent",
                border: 0,
                color: "var(--ink)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <Icon name="close" size={18} />
            </button>
          </div>
          <div className="scroll" style={{ padding: "8px 20px 20px" }}>
            <div
              className="serif"
              style={{ fontSize: 28, lineHeight: 1.05, marginBottom: 8 }}
            >
              From the share sheet
            </div>
            {sharedText ? (
              <div
                className="card"
                style={{
                  padding: 12,
                  marginBottom: 14,
                  background: "var(--bg-elev)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <Icon name="tag" size={14} />
                <div
                  className="small"
                  style={{
                    color: "var(--ink-2)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical" as const,
                  }}
                >
                  {sharedText}
                </div>
              </div>
            ) : (
              <div
                className="small"
                style={{ marginBottom: 14, color: "var(--ink-3)" }}
              >
                No text was shared. Pick a pot and enter the amount.
              </div>
            )}

            <div
              className="tiny"
              style={{
                fontWeight: 700,
                letterSpacing: "0.08em",
                marginBottom: 6,
                color: "var(--ink-3)",
              }}
            >
              POT
            </div>
            {spendable.length === 0 ? (
              <div className="card" style={{ padding: 18, textAlign: "center" }}>
                <div className="serif" style={{ fontSize: 18 }}>
                  Nothing to spend yet
                </div>
                <div className="body" style={{ marginTop: 4 }}>
                  Top up a pot before logging a spend.
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                {spendable.map((b) => {
                  const left = b.allocated - b.spent
                  const selected = bucketId === b.id
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setBucketId(b.id)
                        setError(null)
                      }}
                      className="card"
                      style={{
                        appearance: "none",
                        border: selected ? "1px solid var(--ink)" : 0,
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
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          className="serif"
                          style={{ fontSize: 16, lineHeight: 1, color: "var(--ink)" }}
                        >
                          {b.name}
                        </div>
                        <div className="tiny num" style={{ marginTop: 2 }}>
                          {fmtMoney(left, currency)} left
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            <div
              className="tiny"
              style={{
                fontWeight: 700,
                letterSpacing: "0.08em",
                marginBottom: 6,
                color: "var(--ink-3)",
              }}
            >
              AMOUNT
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span className="serif" style={{ fontSize: 18, color: "var(--ink-3)" }}>
                {currency}
              </span>
              <span
                className="serif"
                style={{
                  fontSize: 44,
                  lineHeight: 1,
                  color: "var(--ink)",
                  letterSpacing: "-0.02em",
                }}
              >
                {amount.toLocaleString("en-US")}
              </span>
            </div>
            <div className="keypad" style={{ marginTop: 10 }}>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "back"].map(
                (k) => (
                  <button key={k} className="key" onClick={() => press(k)}>
                    {k === "back" ? <Icon name="back" size={20} /> : k}
                  </button>
                ),
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              <div
                className="tiny"
                style={{
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  marginBottom: 6,
                  color: "var(--ink-3)",
                }}
              >
                METHOD
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["Cash", "MoMo", "Card", "Transfer"].map((m) => (
                  <button
                    key={m}
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
            </div>

            <input
              className="input"
              placeholder="Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ marginTop: 12 }}
            />

            {error && (
              <div
                className="small"
                style={{ color: "var(--clay-deep)", marginTop: 8, textAlign: "center" }}
              >
                {error}
              </div>
            )}

            <button
              className="btn btn-clay btn-block"
              style={{ marginTop: 12 }}
              disabled={!bucketId || amount <= 0 || pending}
              onClick={submit}
            >
              <Icon name="minus" size={16} />{" "}
              {pending ? "Saving…" : `Log ${fmtMoney(amount, currency)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
