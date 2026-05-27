"use client"

import { useState } from "react"
import { Icon } from "../icons"
import { fmtMoney } from "../format"
import { Pot, Sheet } from "../ui"
import type { Action, AppState } from "../types"

type Step = "pick" | "amount" | "confirm" | "success"

export function DisburseFlow({
  open,
  onClose,
  state,
  dispatch,
  currency,
}: {
  open: boolean
  onClose: () => void
  state: AppState
  dispatch: (a: Action) => void
  currency: string
}) {
  if (!open) return null
  return (
    <DisburseFlowContent
      onClose={onClose}
      state={state}
      dispatch={dispatch}
      currency={currency}
    />
  )
}

function DisburseFlowContent({
  onClose,
  state,
  dispatch,
  currency,
}: {
  onClose: () => void
  state: AppState
  dispatch: (a: Action) => void
  currency: string
}) {
  const [step, setStep] = useState<Step>("pick")
  const [bucketId, setBucketId] = useState<string | null>(null)
  const [amount, setAmount] = useState(0)
  const [note, setNote] = useState("")
  const [method, setMethod] = useState("MoMo")
  const [coins, setCoins] = useState<Array<{ id: number; delay: number }>>([])

  const bucket = state.buckets.find((b) => b.id === bucketId) || null
  const remaining = state.salary - state.buckets.reduce((s, b) => s + b.allocated, 0)
  const stillNeeds = bucket ? Math.max(0, bucket.target - bucket.allocated) : 0

  const press = (k: string) => {
    setAmount((prev) => {
      if (k === "back") return Math.floor(prev / 10)
      if (k === "00") return prev * 100
      return prev * 10 + parseInt(k, 10)
    })
  }

  const confirm = () => {
    if (!bucketId) return
    const drops = Array.from({ length: 7 }).map((_, i) => ({
      id: Date.now() + i,
      delay: i * 90,
    }))
    setCoins(drops)
    setStep("success")
    setTimeout(() => {
      dispatch({ type: "disburse", bucketId, amount, note, method })
      setCoins([])
    }, 900)
  }

  const sheetHeight =
    step === "amount" ? "92%" : step === "success" ? "62%" : "78%"

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
            else if (step === "confirm") setStep("amount")
            else onClose()
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
                  (["pick", "amount", "confirm", "success"] as const).indexOf(step) >= i
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
            Which pot is this <span className="italic">for?</span>
          </div>
          <div className="small" style={{ padding: "6px 4px 14px" }}>
            <span className="num" style={{ color: "var(--ink)", fontWeight: 600 }}>
              {fmtMoney(remaining, currency)}
            </span>{" "}
            still to disburse this month.
          </div>
          {state.buckets.filter((b) => b.allocated < b.target).length === 0 ? (
            <div
              className="card"
              style={{ padding: 22, textAlign: "center" }}
            >
              <div className="serif" style={{ fontSize: 20, marginBottom: 4 }}>
                Every pot is full
              </div>
              <div className="body">Nothing left to fill this month. Nice work.</div>
            </div>
          ) : null}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {state.buckets.map((b) => {
              const done = b.allocated >= b.target
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    setBucketId(b.id)
                    setAmount(Math.max(0, b.target - b.allocated))
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
                    opacity: done ? 0.55 : 1,
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
                      {done ? "Filled" : `Needs ${fmtMoney(b.target - b.allocated, currency)}`}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {step === "amount" && bucket && (
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ padding: "0 4px 10px", display: "flex", alignItems: "center", gap: 10 }}>
            <div className={`row-icon ${bucket.color}`}>
              <Icon name={bucket.icon} size={18} />
            </div>
            <div>
              <div className="serif" style={{ fontSize: 20, lineHeight: 1 }}>
                {bucket.name}
              </div>
              <div className="tiny">Needs {fmtMoney(stillNeeds, currency)} to fill</div>
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
              You&apos;re sending
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
              {[stillNeeds || 100, 500, 1000]
                .filter((v, i, a) => v > 0 && a.indexOf(v) === i)
                .map((v) => (
                  <button key={v} className="chip" onClick={() => setAmount(v)}>
                    {v === stillNeeds && stillNeeds > 0
                      ? "Fill it"
                      : fmtMoney(v, currency)}
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
            disabled={amount <= 0}
            onClick={() => setStep("confirm")}
          >
            Review <Icon name="chevron" size={16} />
          </button>
        </div>
      )}

      {step === "confirm" && bucket && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div
            className="serif"
            style={{ fontSize: 26, lineHeight: 1.05, padding: "4px 4px 12px" }}
          >
            Confirm the move
          </div>
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div className="tiny">Sending</div>
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
              <div className="tiny">To pot</div>
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
              <div className="tiny">After this</div>
              <div className="num" style={{ fontWeight: 600 }}>
                {fmtMoney(bucket.allocated + amount, currency)}{" "}
                <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>
                  / {fmtMoney(bucket.target, currency)}
                </span>
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
              {["MoMo", "Transfer", "Card", "Cash"].map((m) => (
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
            placeholder="Add a note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ marginBottom: 12 }}
          />

          <button className="btn btn-green btn-block" onClick={confirm}>
            <Icon name="send" size={16} /> Send {fmtMoney(amount, currency)}
          </button>
        </div>
      )}

      {step === "success" && bucket && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 0",
            position: "relative",
          }}
        >
          <div style={{ position: "relative", width: 140, height: 140 }}>
            <Pot
              pct={Math.min(
                100,
                ((bucket.allocated + amount) / bucket.target) * 100,
              )}
              size={140}
            />
            {coins.map((c) => (
              <span
                key={c.id}
                className="coin"
                style={{ animationDelay: `${c.delay}ms` }}
              ></span>
            ))}
          </div>
          <div
            className="serif pop-in"
            style={{ fontSize: 28, marginTop: 16, color: "var(--ink)" }}
          >
            Landed <span className="italic">safely.</span>
          </div>
          <div
            className="body pop-in"
            style={{ textAlign: "center", marginTop: 6, padding: "0 32px" }}
          >
            {fmtMoney(amount, currency)} sent to{" "}
            <span style={{ color: "var(--ink)", fontWeight: 600 }}>{bucket.name}</span>.
          </div>
          <button className="btn btn-primary" style={{ marginTop: 22 }} onClick={onClose}>
            Done
          </button>
        </div>
      )}
    </Sheet>
  )
}
