"use client"

import { useState } from "react"
import { Icon } from "../icons"
import { fmtMoney, fmtTxnDate } from "../format"
import { Pot } from "../ui"
import { EditPotSheet } from "./edit-pot"
import { TransferSheet } from "./transfer"
import { SpendSheet } from "./spend"
import type { Action, AppState } from "../types"

export function BucketDetailScreen({
  bucketId,
  state,
  dispatch,
  onBack,
  onOpenDisburse,
  currency,
  avgEssentialsPerMonth,
}: {
  bucketId: string
  state: AppState
  dispatch: (a: Action) => void
  onBack: () => void
  onOpenDisburse: (id: string) => void
  currency: string
  avgEssentialsPerMonth: number
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [editFocus, setEditFocus] = useState<"target" | undefined>(undefined)
  const [transferOpen, setTransferOpen] = useState(false)
  const [spendOpen, setSpendOpen] = useState(false)

  const bucket = state.buckets.find((b) => b.id === bucketId)

  // Filter ledger to current calendar month so the "This month" label matches.
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const ledger = state.ledger.filter(
    (t) => t.bucketId === bucketId && new Date(t.occurredAt) >= monthStart,
  )

  if (!bucket) return null
  const pct = bucket.target > 0 ? (bucket.allocated / bucket.target) * 100 : 0
  const remaining = Math.max(0, bucket.target - bucket.allocated)

  const dueBadge = (() => {
    if (bucket.kind !== "bills" || !bucket.dueDayOfMonth) return null
    if (bucket.allocated >= bucket.target) {
      return { text: `Paid · was due day ${bucket.dueDayOfMonth}`, tone: "ok" as const }
    }
    const today = now.getDate()
    const diff = bucket.dueDayOfMonth - today
    if (diff < 0) return { text: `Overdue by ${-diff}d`, tone: "warn" as const }
    if (diff === 0) return { text: "Due today", tone: "warn" as const }
    if (diff <= 3) return { text: `Due in ${diff}d`, tone: "warn" as const }
    return { text: `Due day ${bucket.dueDayOfMonth}`, tone: "muted" as const }
  })()

  const projectionBadge = (() => {
    if (bucket.kind !== "future" && bucket.kind !== "emergency") return null
    const p = bucket.projection
    if (!p) return null
    if (p.goalReached) {
      return { text: "Goal reached", tone: "ok" as const }
    }
    if (p.etaIso && p.monthsToGoal != null) {
      const eta = new Date(p.etaIso)
      const month = eta.toLocaleString("en-US", { month: "short", year: "numeric" })
      return {
        text: `${fmtMoney(p.avgPerMonth, currency)}/mo · hit by ${month}`,
        tone: "muted" as const,
      }
    }
    if (p.avgPerMonth > 0) {
      return {
        text: `${fmtMoney(p.avgPerMonth, currency)}/mo`,
        tone: "muted" as const,
      }
    }
    return { text: "No deposits in 3 mo", tone: "warn" as const }
  })()

  const cushion = (() => {
    if (bucket.kind !== "emergency") return null
    if (!bucket.projection) return null
    const balance = bucket.projection.lifetimeBalance
    if (avgEssentialsPerMonth <= 0) {
      return {
        months: null as number | null,
        balance,
        burn: 0,
      }
    }
    return {
      months: balance / avgEssentialsPerMonth,
      balance,
      burn: avgEssentialsPerMonth,
    }
  })()

  const openEdit = (focus?: "target") => {
    setEditFocus(focus)
    setEditOpen(true)
  }

  return (
    <>
      <div
        style={{
          padding: "8px 20px 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button className="btn btn-ghost btn-icon" onClick={onBack} aria-label="Back">
          <Icon name="back" size={18} />
        </button>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <div
            className="tiny"
            style={{ fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}
          >
            Pot · {bucket.kind}
          </div>
          {dueBadge && <HeaderBadge text={dueBadge.text} tone={dueBadge.tone} />}
          {projectionBadge && (
            <HeaderBadge text={projectionBadge.text} tone={projectionBadge.tone} />
          )}
        </div>
        <button
          className="btn btn-ghost btn-icon"
          aria-label="Edit pot"
          onClick={() => openEdit()}
        >
          <Icon name="more" size={18} />
        </button>
      </div>

      <div
        style={{
          padding: "0 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Pot pct={pct} size={150} />
        <div className="serif" style={{ fontSize: 36, marginTop: 14, color: "var(--ink)" }}>
          {bucket.name}
        </div>
        <div className="num" style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>
          <span style={{ color: "var(--ink)", fontWeight: 600 }}>
            {fmtMoney(bucket.allocated, currency)}
          </span>
          &nbsp;of&nbsp;{fmtMoney(bucket.target, currency)}&nbsp;·&nbsp;{Math.round(pct)}%
        </div>

        {(bucket.kind === "future" || bucket.kind === "emergency") &&
          bucket.projection &&
          bucket.projection.lifetimeBalance > 0 && (
            <div
              className="card"
              style={{
                marginTop: 14,
                padding: 12,
                width: "100%",
                background: "var(--green-tint)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Icon name="piggy" size={18} />
              <div className="body" style={{ color: "var(--green-deep)", flex: 1 }}>
                <strong style={{ color: "var(--green-deep)" }}>
                  {fmtMoney(bucket.projection.lifetimeBalance, currency)}
                </strong>{" "}
                saved over all months
                {bucket.target > 0 && !bucket.projection.goalReached && (
                  <>
                    {" "}
                    · {fmtMoney(
                      Math.max(0, bucket.target - bucket.projection.lifetimeBalance),
                      currency,
                    )}{" "}
                    to goal
                  </>
                )}
                .
              </div>
            </div>
          )}

        {cushion && (
          <div
            className="card"
            style={{
              marginTop: 10,
              padding: 12,
              width: "100%",
              background: "var(--bg-elev)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Icon name="shield" size={18} />
            <div className="body" style={{ flex: 1 }}>
              {cushion.months == null ? (
                <>Log a few months of essentials to size this cushion.</>
              ) : (
                <>
                  <strong>{cushion.months.toFixed(1)} months</strong> of essentials
                  covered{" "}
                  <span style={{ color: "var(--ink-3)" }}>
                    · {fmtMoney(cushion.burn, currency)}/mo burn
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {bucket.spent > 0 && (
          <div
            style={{
              marginTop: 14,
              width: "100%",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
            }}
          >
            <StatCell
              label="In"
              value={fmtMoney(bucket.allocated, currency)}
              tone="ink"
            />
            <StatCell
              label="Spent"
              value={fmtMoney(bucket.spent, currency)}
              tone="clay"
            />
            <StatCell
              label="Left"
              value={fmtMoney(Math.max(0, bucket.allocated - bucket.spent), currency)}
              tone="green"
            />
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
            marginTop: 18,
            width: "100%",
          }}
        >
          <button
            className="btn btn-green"
            onClick={() => onOpenDisburse(bucket.id)}
            style={{ padding: "10px 8px", fontSize: 13 }}
          >
            <Icon name="send" size={14} /> Top up
          </button>
          <button
            className="btn btn-clay"
            onClick={() => setSpendOpen(true)}
            disabled={bucket.allocated - bucket.spent <= 0}
            style={{ padding: "10px 8px", fontSize: 13 }}
          >
            <Icon name="minus" size={14} /> Spend
          </button>
          <button
            className="btn btn-soft"
            onClick={() => setTransferOpen(true)}
            disabled={bucket.allocated - bucket.spent <= 0 || state.buckets.length < 2}
            style={{ padding: "10px 8px", fontSize: 13 }}
          >
            <Icon name="share" size={14} /> Move
          </button>
        </div>
        <div style={{ width: "100%", marginTop: 8 }}>
          <button
            className="btn btn-ghost btn-block"
            onClick={() => openEdit("target")}
            style={{ fontSize: 13 }}
          >
            <Icon name="edit" size={14} /> Adjust target
          </button>
        </div>
      </div>

      <div
        style={{
          padding: "22px 20px 8px",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <div className="serif" style={{ fontSize: 22 }}>
          This month
        </div>
        <div className="tiny">
          {ledger.length} entr{ledger.length === 1 ? "y" : "ies"}
        </div>
      </div>

      <div style={{ padding: "0 20px 28px" }}>
        <div className="card" style={{ padding: "4px 4px" }}>
          {ledger.length === 0 && (
            <div style={{ padding: 18, textAlign: "center" }}>
              <div className="body">No activity yet for {bucket.name}.</div>
            </div>
          )}
          {ledger.map((t) => {
            const outflow = t.amount < 0
            const isTransfer = !!t.transferId
            const rowIcon = outflow
              ? isTransfer
                ? "share"
                : "minus"
              : bucket.icon
            return (
              <div
                key={t.id}
                className="row"
                style={{ borderTop: "1px solid transparent" }}
              >
                <div className={`row-icon ${bucket.color}`}>
                  <Icon name={rowIcon} size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>
                    {t.note}
                  </div>
                  <div className="tiny">
                    {fmtTxnDate(t.occurredAt)} · {t.method}
                  </div>
                </div>
                <div
                  className="num"
                  style={{
                    fontWeight: 600,
                    color: outflow ? "var(--clay-deep)" : undefined,
                  }}
                >
                  {outflow ? "−" : "+"}
                  {fmtMoney(Math.abs(t.amount), currency)}
                </div>
              </div>
            )
          })}
        </div>
        {remaining > 0 && (
          <div
            className="card"
            style={{
              marginTop: 10,
              padding: 14,
              background: "var(--green-tint)",
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <Icon name="info" size={18} />
            <div className="body" style={{ color: "var(--green-deep)" }}>
              <strong style={{ color: "var(--green-deep)" }}>
                {fmtMoney(remaining, currency)}
              </strong>{" "}
              still needed to fill this pot.
            </div>
          </div>
        )}
      </div>

      <EditPotSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        bucket={bucket}
        focusField={editFocus}
      />

      <TransferSheet
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        fromBucketId={bucket.id}
        state={state}
        dispatch={dispatch}
        currency={currency}
      />

      <SpendSheet
        open={spendOpen}
        onClose={() => setSpendOpen(false)}
        bucketId={bucket.id}
        state={state}
        dispatch={dispatch}
        currency={currency}
      />
    </>
  )
}

function HeaderBadge({
  text,
  tone,
}: {
  text: string
  tone: "ok" | "warn" | "muted"
}) {
  const bg =
    tone === "warn"
      ? "var(--clay-soft)"
      : tone === "ok"
        ? "var(--green-tint)"
        : "rgba(33,26,18,0.06)"
  const color =
    tone === "warn"
      ? "var(--clay-deep)"
      : tone === "ok"
        ? "var(--green-deep)"
        : "var(--ink-2)"
  return (
    <span
      className="tiny"
      style={{
        padding: "2px 8px",
        borderRadius: 999,
        fontWeight: 700,
        letterSpacing: "0.04em",
        background: bg,
        color,
      }}
    >
      {text}
    </span>
  )
}

function StatCell({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: "ink" | "clay" | "green"
}) {
  const color =
    tone === "clay"
      ? "var(--clay-deep)"
      : tone === "green"
        ? "var(--green-deep)"
        : "var(--ink)"
  return (
    <div
      className="card"
      style={{
        padding: "8px 10px",
        textAlign: "center",
        background: "var(--bg-card)",
      }}
    >
      <div
        className="tiny"
        style={{ fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-3)" }}
      >
        {label.toUpperCase()}
      </div>
      <div
        className="num"
        style={{ fontWeight: 600, fontSize: 14, color, marginTop: 2 }}
      >
        {value}
      </div>
    </div>
  )
}
