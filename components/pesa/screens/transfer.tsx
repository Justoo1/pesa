"use client"

import { useState } from "react"
import { Icon } from "../icons"
import { fmtMoney } from "../format"
import { Sheet } from "../ui"
import type { Action, AppState } from "../types"

type Step = "pick" | "amount" | "confirm"

export function TransferSheet({
  open,
  onClose,
  fromBucketId,
  state,
  dispatch,
  currency,
}: {
  open: boolean
  onClose: () => void
  fromBucketId: string | null
  state: AppState
  dispatch: (a: Action) => void
  currency: string
}) {
  if (!open || !fromBucketId) return null
  return (
    <TransferSheetContent
      onClose={onClose}
      fromBucketId={fromBucketId}
      state={state}
      dispatch={dispatch}
      currency={currency}
    />
  )
}

function TransferSheetContent({
  onClose,
  fromBucketId,
  state,
  dispatch,
  currency,
}: {
  onClose: () => void
  fromBucketId: string
  state: AppState
  dispatch: (a: Action) => void
  currency: string
}) {
  const [step, setStep] = useState<Step>("pick")
  const [toBucketId, setToBucketId] = useState<string | null>(null)
  const [amount, setAmount] = useState(0)
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  const from = state.buckets.find((b) => b.id === fromBucketId)
  const to = state.buckets.find((b) => b.id === toBucketId) || null
  const moveable = Math.max(0, (from?.allocated ?? 0) - (from?.spent ?? 0))

  if (!from) return null

  const press = (k: string) => {
    setError(null)
    setAmount((prev) => {
      if (k === "back") return Math.floor(prev / 10)
      if (k === "00") return prev * 100
      return prev * 10 + parseInt(k, 10)
    })
  }

  const confirm = () => {
    if (!toBucketId) return
    if (amount <= 0) {
      setError("Enter an amount above zero.")
      return
    }
    if (amount > moveable) {
      setError(`Only ${fmtMoney(moveable, currency)} in ${from.name}.`)
      return
    }
    dispatch({
      type: "transfer",
      fromBucketId,
      toBucketId,
      amount,
      note: note.trim() || undefined,
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
            if (step === "pick") onClose()
            else if (step === "amount") setStep("pick")
            else setStep("amount")
          }}
          aria-label="Back"
        >
          <Icon name={step === "pick" ? "close" : "back"} size={18} />
        </button>
        <div style={{ display: "flex", gap: 4 }}>
          {(["pick", "amount", "confirm"] as const).map((s, i) => (
            <span
              key={s}
              style={{
                width: step === s ? 18 : 6,
                height: 6,
                borderRadius: 999,
                background:
                  (["pick", "amount", "confirm"] as const).indexOf(step) >= i
                    ? "var(--ink)"
                    : "var(--line)",
                transition: "all 200ms ease",
              }}
            ></span>
          ))}
        </div>
        <div style={{ width: 44 }}></div>
      </div>

      {step === "pick" && (
        <div style={{ overflowY: "auto", flex: 1 }}>
          <div
            className="serif"
            style={{ fontSize: 28, lineHeight: 1.05, padding: "4px 4px 4px" }}
          >
            Move from <span className="italic">{from.name}</span> to…
          </div>
          <div className="small" style={{ padding: "6px 4px 14px" }}>
            <span className="num" style={{ color: "var(--ink)", fontWeight: 600 }}>
              {fmtMoney(moveable, currency)}
            </span>{" "}
            sitting in {from.name} this month.
          </div>
          {state.buckets.filter((b) => b.id !== fromBucketId).length === 0 ? (
            <div className="card" style={{ padding: 22, textAlign: "center" }}>
              <div className="serif" style={{ fontSize: 20, marginBottom: 4 }}>
                No other pots
              </div>
              <div className="body">Create another pot to move money around.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {state.buckets
                .filter((b) => b.id !== fromBucketId)
                .map((b) => {
                  const room = Math.max(0, b.target - b.allocated)
                  return (
                    <button
                      key={b.id}
                      onClick={() => {
                        setToBucketId(b.id)
                        setAmount(Math.min(moveable, room > 0 ? room : moveable))
                        setStep("amount")
                      }}
                      className="card"
                      style={{
                        appearance: "none",
                        border: 0,
                        textAlign: "left",
                        padding: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        cursor: "pointer",
                      }}
                    >
                      <div className={`row-icon ${b.color}`}>
                        <Icon name={b.icon} size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          className="serif"
                          style={{ fontSize: 17, lineHeight: 1, color: "var(--ink)" }}
                        >
                          {b.name}
                        </div>
                        <div className="tiny num" style={{ marginTop: 2 }}>
                          {room > 0 ? `Room for ${fmtMoney(room, currency)}` : "Filled"}
                        </div>
                      </div>
                    </button>
                  )
                })}
            </div>
          )}
        </div>
      )}

      {step === "amount" && to && (
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div
            style={{ padding: "0 4px 10px", display: "flex", alignItems: "center", gap: 10 }}
          >
            <div className={`row-icon ${from.color}`}>
              <Icon name={from.icon} size={18} />
            </div>
            <Icon name="chevron" size={14} />
            <div className={`row-icon ${to.color}`}>
              <Icon name={to.icon} size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="serif" style={{ fontSize: 18, lineHeight: 1 }}>
                {from.name} → {to.name}
              </div>
              <div className="tiny">
                {fmtMoney(moveable, currency)} available
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
              You&apos;re moving
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
              {[moveable, 100, 500]
                .filter((v, i, a) => v > 0 && v <= moveable && a.indexOf(v) === i)
                .map((v) => (
                  <button key={v} className="chip" onClick={() => setAmount(v)}>
                    {v === moveable ? "All of it" : fmtMoney(v, currency)}
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
          <button
            className="btn btn-green btn-block"
            style={{ marginTop: 10 }}
            disabled={amount <= 0 || amount > moveable}
            onClick={() => setStep("confirm")}
          >
            Review <Icon name="chevron" size={16} />
          </button>
        </div>
      )}

      {step === "confirm" && to && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div
            className="serif"
            style={{ fontSize: 26, lineHeight: 1.05, padding: "4px 4px 12px" }}
          >
            Confirm the move
          </div>
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <Row label="Moving" value={fmtMoney(amount, currency)} bold />
            <div className="divider" style={{ margin: "12px 0" }}></div>
            <Row
              label="From"
              valueNode={
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    className={`row-icon ${from.color}`}
                    style={{ width: 28, height: 28, borderRadius: 8 }}
                  >
                    <Icon name={from.icon} size={14} />
                  </span>
                  <span style={{ fontWeight: 600 }}>{from.name}</span>
                </span>
              }
            />
            <div className="divider" style={{ margin: "12px 0" }}></div>
            <Row
              label="To"
              valueNode={
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    className={`row-icon ${to.color}`}
                    style={{ width: 28, height: 28, borderRadius: 8 }}
                  >
                    <Icon name={to.icon} size={14} />
                  </span>
                  <span style={{ fontWeight: 600 }}>{to.name}</span>
                </span>
              }
            />
            <div className="divider" style={{ margin: "12px 0" }}></div>
            <Row
              label={`${from.name} after`}
              value={fmtMoney(from.allocated - amount, currency)}
            />
            <div className="divider" style={{ margin: "12px 0" }}></div>
            <Row
              label={`${to.name} after`}
              valueNode={
                <span className="num" style={{ fontWeight: 600 }}>
                  {fmtMoney(to.allocated + amount, currency)}{" "}
                  <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>
                    / {fmtMoney(to.target, currency)}
                  </span>
                </span>
              }
            />
          </div>

          <input
            className="input"
            placeholder="Add a note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ marginBottom: 12 }}
          />

          {error && (
            <div
              className="small"
              style={{ color: "var(--clay-deep)", marginBottom: 8, textAlign: "center" }}
            >
              {error}
            </div>
          )}

          <button className="btn btn-green btn-block" onClick={confirm}>
            <Icon name="send" size={16} /> Move {fmtMoney(amount, currency)}
          </button>
        </div>
      )}
    </Sheet>
  )
}

function Row({
  label,
  value,
  valueNode,
  bold,
}: {
  label: string
  value?: string
  valueNode?: React.ReactNode
  bold?: boolean
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div className="tiny">{label}</div>
      {valueNode ?? (
        <div
          className="num"
          style={{ fontSize: bold ? 22 : 14, fontWeight: 600 }}
        >
          {value}
        </div>
      )}
    </div>
  )
}
