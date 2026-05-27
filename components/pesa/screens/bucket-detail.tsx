"use client"

import { Icon } from "../icons"
import { fmtMoney, fmtTxnDate } from "../format"
import { Pot } from "../ui"
import type { AppState } from "../types"

export function BucketDetailScreen({
  bucketId,
  state,
  onBack,
  onOpenDisburse,
  currency,
}: {
  bucketId: string
  state: AppState
  onBack: () => void
  onOpenDisburse: (id: string) => void
  currency: string
}) {
  const bucket = state.buckets.find((b) => b.id === bucketId)
  const ledger = state.ledger.filter((t) => t.bucketId === bucketId)
  if (!bucket) return null
  const pct = (bucket.allocated / bucket.target) * 100
  const remaining = Math.max(0, bucket.target - bucket.allocated)

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
          className="tiny"
          style={{ fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          Pot · {bucket.kind}
        </div>
        <button className="btn btn-ghost btn-icon" aria-label="More">
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginTop: 18,
            width: "100%",
          }}
        >
          <button className="btn btn-green" onClick={() => onOpenDisburse(bucket.id)}>
            <Icon name="send" size={16} /> Top up
          </button>
          <button className="btn btn-soft">
            <Icon name="edit" size={16} /> Adjust target
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
          {ledger.length} transfer{ledger.length === 1 ? "" : "s"}
        </div>
      </div>

      <div style={{ padding: "0 20px 28px" }}>
        <div className="card" style={{ padding: "4px 4px" }}>
          {ledger.length === 0 && (
            <div style={{ padding: 18, textAlign: "center" }}>
              <div className="body">No transfers yet for {bucket.name}.</div>
            </div>
          )}
          {ledger.map((t) => (
            <div key={t.id} className="row" style={{ borderTop: "1px solid transparent" }}>
              <div className={`row-icon ${bucket.color}`}>
                <Icon name={bucket.icon} size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>
                  {t.note}
                </div>
                <div className="tiny">
                  {fmtTxnDate(t.occurredAt)} · {t.method}
                </div>
              </div>
              <div className="num" style={{ fontWeight: 600 }}>
                +{fmtMoney(t.amount, currency)}
              </div>
            </div>
          ))}
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
    </>
  )
}
