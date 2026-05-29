"use client"

import { useMemo, useState } from "react"
import { Icon } from "../icons"
import { fmtMoney } from "../format"
import { Sheet } from "../ui"
import type { Action } from "../types"

export type PaydayDraft = {
  bucketId: string
  bucketName: string
  amount: number
  color: string
  icon: string
  alreadyThisMonth: number
}

export function PaydayReviewSheet({
  open,
  onClose,
  template,
  dispatch,
  currency,
  monthLabel,
  remainingToDisburse,
}: {
  open: boolean
  onClose: () => void
  template: PaydayDraft[]
  dispatch: (a: Action) => void
  currency: string
  monthLabel: string
  remainingToDisburse: number
}) {
  if (!open) return null
  return (
    <PaydayReviewContent
      onClose={onClose}
      template={template}
      dispatch={dispatch}
      currency={currency}
      monthLabel={monthLabel}
      remainingToDisburse={remainingToDisburse}
    />
  )
}

function PaydayReviewContent({
  onClose,
  template,
  dispatch,
  currency,
  monthLabel,
  remainingToDisburse,
}: {
  onClose: () => void
  template: PaydayDraft[]
  dispatch: (a: Action) => void
  currency: string
  monthLabel: string
  remainingToDisburse: number
}) {
  const [drafts, setDrafts] = useState(() =>
    template.map((t) => ({ ...t, include: true })),
  )

  const total = useMemo(
    () => drafts.reduce((s, d) => (d.include ? s + d.amount : s), 0),
    [drafts],
  )

  const setAmount = (bucketId: string, raw: string) => {
    const n = parseInt(raw.replace(/[^0-9]/g, ""), 10) || 0
    setDrafts((prev) =>
      prev.map((d) => (d.bucketId === bucketId ? { ...d, amount: n } : d)),
    )
  }

  const toggle = (bucketId: string) => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.bucketId === bucketId ? { ...d, include: !d.include } : d,
      ),
    )
  }

  const send = () => {
    const payload = drafts
      .filter((d) => d.include && d.amount > 0)
      .map((d) => ({ bucketId: d.bucketId, amount: d.amount, note: "Payday replay" }))
    if (payload.length === 0) {
      onClose()
      return
    }
    dispatch({ type: "payday-replay", drafts: payload })
    onClose()
  }

  const overSalary = remainingToDisburse > 0 && total > remainingToDisburse

  return (
    <Sheet open={true} onClose={onClose} height="92%">
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
        <div
          className="tiny"
          style={{
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
          }}
        >
          {monthLabel} · Payday
        </div>
        <div style={{ width: 44 }}></div>
      </div>

      <div className="serif" style={{ fontSize: 28, lineHeight: 1.05, padding: "4px 4px 4px" }}>
        Replay last month&apos;s <span className="italic">moves</span>.
      </div>
      <div className="small" style={{ padding: "6px 4px 10px" }}>
        Edit any line, tap the dot to skip a pot, then send them all at once.
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          padding: "8px 4px",
          marginBottom: 8,
          borderTop: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div className="tiny" style={{ fontWeight: 700, letterSpacing: "0.08em" }}>
          TOTAL
        </div>
        <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>
          {fmtMoney(total, currency)}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
        {drafts.length === 0 && (
          <div className="card" style={{ padding: 18, textAlign: "center" }}>
            <div className="serif" style={{ fontSize: 20, marginBottom: 4 }}>
              No template yet
            </div>
            <div className="body">
              Disburse to a few pots this month and we&apos;ll build the template
              for next time.
            </div>
          </div>
        )}
        {drafts.map((d) => (
          <div
            key={d.bucketId}
            className="card"
            style={{
              marginBottom: 8,
              padding: 12,
              display: "flex",
              alignItems: "center",
              gap: 10,
              opacity: d.include ? 1 : 0.45,
            }}
          >
            <button
              type="button"
              onClick={() => toggle(d.bucketId)}
              aria-label={d.include ? "Skip this pot" : "Include this pot"}
              style={{
                background: "transparent",
                border: 0,
                padding: 0,
                cursor: "pointer",
              }}
            >
              <div
                className={`row-icon ${d.color}`}
                style={{ position: "relative" }}
              >
                <Icon name={d.icon as never} size={16} />
                {!d.include && (
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "inherit",
                      background: "rgba(33,26,18,0.55)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#F4EBD9",
                    }}
                  >
                    <Icon name="close" size={12} />
                  </span>
                )}
              </div>
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="serif"
                style={{ fontSize: 17, lineHeight: 1.1, color: "var(--ink)" }}
              >
                {d.bucketName}
              </div>
              <div className="tiny num" style={{ marginTop: 2 }}>
                {d.alreadyThisMonth > 0
                  ? `${fmtMoney(d.alreadyThisMonth, currency)} this month`
                  : "Nothing this month"}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span className="num tiny" style={{ color: "var(--ink-3)" }}>
                {currency}
              </span>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                value={d.amount === 0 ? "" : String(d.amount)}
                onChange={(e) => setAmount(d.bucketId, e.target.value)}
                disabled={!d.include}
                style={{
                  width: 90,
                  background: "var(--bg-elev)",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  padding: "6px 10px",
                  fontFamily: "var(--mono)",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--ink)",
                  textAlign: "right",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {overSalary && (
        <div
          className="small"
          style={{ color: "var(--clay-deep)", textAlign: "center", marginBottom: 6 }}
        >
          Total exceeds what&apos;s left to disburse this month.
        </div>
      )}

      <button
        className="btn btn-green btn-block"
        disabled={total <= 0}
        onClick={send}
      >
        <Icon name="send" size={16} /> Send {fmtMoney(total, currency)}
      </button>
    </Sheet>
  )
}
