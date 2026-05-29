"use client"

import { useState } from "react"
import { Icon } from "../icons"
import { fmtMoney } from "../format"
import { Sheet } from "../ui"
import type { Action, AppState } from "../types"

type Step = "amount" | "confirm"

export function SpendSheet({
  open,
  onClose,
  bucketId,
  state,
  dispatch,
  currency,
}: {
  open: boolean
  onClose: () => void
  bucketId: string | null
  state: AppState
  dispatch: (a: Action) => void
  currency: string
}) {
  if (!open || !bucketId) return null
  return (
    <SpendSheetContent
      onClose={onClose}
      bucketId={bucketId}
      state={state}
      dispatch={dispatch}
      currency={currency}
    />
  )
}

function SpendSheetContent({
  onClose,
  bucketId,
  state,
  dispatch,
  currency,
}: {
  onClose: () => void
  bucketId: string
  state: AppState
  dispatch: (a: Action) => void
  currency: string
}) {
  const [step, setStep] = useState<Step>("amount")
  const [amount, setAmount] = useState(0)
  const [note, setNote] = useState("")
  const [method, setMethod] = useState("Cash")
  const [error, setError] = useState<string | null>(null)

  const bucket = state.buckets.find((b) => b.id === bucketId)
  if (!bucket) return null

  const available = Math.max(0, bucket.allocated - bucket.spent)

  const press = (k: string) => {
    setError(null)
    setAmount((prev) => {
      if (k === "back") return Math.floor(prev / 10)
      if (k === "00") return prev * 100
      return prev * 10 + parseInt(k, 10)
    })
  }

  const confirm = () => {
    if (amount <= 0) {
      setError("Enter an amount above zero.")
      return
    }
    if (amount > available) {
      setError(`Only ${fmtMoney(available, currency)} left in ${bucket.name}.`)
      return
    }
    dispatch({
      type: "spend",
      bucketId,
      amount,
      note: note.trim() || undefined,
      method,
    })
    onClose()
  }

  const sheetHeight = step === "amount" ? "92%" : "78%"

  return (
    <Sheet open={true} onClose={onClose} height={sheetHeight}>
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
          onClick={() => {
            if (step === "amount") onClose()
            else setStep("amount")
          }}
          aria-label="Back"
        >
          <Icon name={step === "amount" ? "close" : "back"} size={18} />
        </button>
        <div style={{ display: "flex", gap: 4 }}>
          {(["amount", "confirm"] as const).map((s, i) => (
            <span
              key={s}
              style={{
                width: step === s ? 18 : 6,
                height: 6,
                borderRadius: 999,
                background:
                  (["amount", "confirm"] as const).indexOf(step) >= i
                    ? "var(--ink)"
                    : "var(--line)",
                transition: "all 200ms ease",
              }}
            ></span>
          ))}
        </div>
        <div style={{ width: 44 }}></div>
      </div>

      {step === "amount" && (
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div
            style={{ padding: "0 4px 10px", display: "flex", alignItems: "center", gap: 10 }}
          >
            <div className={`row-icon ${bucket.color}`}>
              <Icon name={bucket.icon} size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="serif" style={{ fontSize: 20, lineHeight: 1 }}>
                Spend from {bucket.name}
              </div>
              <div className="tiny">
                {fmtMoney(available, currency)} left in pot
              </div>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px 0",
            }}
          >
            <div className="tiny" style={{ marginBottom: 6 }}>
              You spent
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span className="serif" style={{ fontSize: 24, color: "var(--ink-3)" }}>
                {currency}
              </span>
              <span
                className="serif"
                style={{
                  fontSize: 72,
                  lineHeight: 1,
                  color: "var(--ink)",
                  letterSpacing: "-0.02em",
                }}
              >
                {amount.toLocaleString("en-US")}
              </span>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
              {[available, 50, 100, 500]
                .filter((v, i, a) => v > 0 && v <= available && a.indexOf(v) === i)
                .slice(0, 4)
                .map((v) => (
                  <button key={v} className="chip" onClick={() => setAmount(v)}>
                    {v === available ? "Empty it" : fmtMoney(v, currency)}
                  </button>
                ))}
            </div>
          </div>

          <div className="keypad" style={{ marginTop: 8 }}>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "back"].map((k) => (
              <button key={k} className="key" onClick={() => press(k)}>
                {k === "back" ? <Icon name="back" size={22} /> : k}
              </button>
            ))}
          </div>
          {error && (
            <div
              className="small"
              style={{ color: "var(--clay-deep)", marginTop: 6, textAlign: "center" }}
            >
              {error}
            </div>
          )}
          <button
            className="btn btn-clay btn-block"
            style={{ marginTop: 10 }}
            disabled={amount <= 0 || amount > available}
            onClick={() => setStep("confirm")}
          >
            Review <Icon name="chevron" size={16} />
          </button>
        </div>
      )}

      {step === "confirm" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div
            className="serif"
            style={{ fontSize: 26, lineHeight: 1.05, padding: "4px 4px 12px" }}
          >
            Log the spend
          </div>
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div className="tiny">Spending</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>
                {fmtMoney(amount, currency)}
              </div>
            </div>
            <div className="divider" style={{ margin: "12px 0" }}></div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div className="tiny">From pot</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  className={`row-icon ${bucket.color}`}
                  style={{ width: 28, height: 28, borderRadius: 8 }}
                >
                  <Icon name={bucket.icon} size={14} />
                </div>
                <span style={{ fontWeight: 600 }}>{bucket.name}</span>
              </div>
            </div>
            <div className="divider" style={{ margin: "12px 0" }}></div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div className="tiny">Left after</div>
              <div className="num" style={{ fontWeight: 600 }}>
                {fmtMoney(available - amount, currency)}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div
              className="tiny"
              style={{ marginBottom: 6, fontWeight: 600, letterSpacing: "0.08em" }}
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
            placeholder="What was it for? (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ marginBottom: 12 }}
          />

          <button className="btn btn-clay btn-block" onClick={confirm}>
            <Icon name="minus" size={16} /> Log {fmtMoney(amount, currency)}
          </button>
        </div>
      )}
    </Sheet>
  )
}
