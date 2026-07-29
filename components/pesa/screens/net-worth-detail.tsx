"use client"

import { Icon } from "../icons"
import { fmtMoney } from "../format"
import { Sheet } from "../ui"
import type { AppState, BucketColor, MonthRow } from "../types"

const dotBg = (c: BucketColor) =>
  c === "clay"
    ? "var(--clay)"
    : c === "gold"
      ? "var(--gold)"
      : c === "rose"
        ? "var(--rose)"
        : c === "sage"
          ? "var(--green-soft)"
          : "var(--green)"

export function NetWorthDetailSheet({
  open,
  onClose,
  state,
  months,
  currency,
  netWorth,
  avgSaved,
}: {
  open: boolean
  onClose: () => void
  state: AppState
  months: MonthRow[]
  currency: string
  netWorth: number
  avgSaved: number
}) {
  if (!open) return null

  const contributors = state.buckets
    .filter((b) => b.kind === "future" || b.kind === "emergency" || b.kind === "debt")
    .map((b) => ({
      ...b,
      lifetimeBalance: b.projection?.lifetimeBalance ?? 0,
    }))
    .filter((b) => b.lifetimeBalance !== 0)
    .sort((a, b) => b.lifetimeBalance - a.lifetimeBalance)

  const totalContributed = contributors.reduce((s, b) => s + b.lifetimeBalance, 0)
  const monthMax = Math.max(1, ...months.map((m) => m.saved))

  return (
    <Sheet open={true} onClose={onClose} height="90%">
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
        <div className="serif" style={{ fontSize: 22 }}>
          Net worth
        </div>
        <div style={{ width: 44 }}></div>
      </div>

      <div style={{ overflowY: "auto", flex: 1, padding: "0 4px 12px" }}>
        <div
          className="card"
          style={{
            padding: 18,
            background: "linear-gradient(135deg, #FBF5E7 0%, #F1E1B8 100%)",
          }}
        >
          <div
            className="tiny"
            style={{
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: "#6E4F12",
            }}
          >
            Estimated net worth
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
            <span className="serif" style={{ fontSize: 14, color: "#6E4F12" }}>
              {currency}
            </span>
            <span className="serif" style={{ fontSize: 38, lineHeight: 1, color: "#3D2A07" }}>
              {netWorth.toLocaleString("en-US")}
            </span>
          </div>
          <div className="small" style={{ marginTop: 6, color: "#6E4F12" }}>
            {avgSaved > 0
              ? `↑ ${fmtMoney(avgSaved, currency)}/mo on average`
              : "Build up savings to see a trend."}
          </div>
        </div>

        <div style={{ padding: "20px 0 0" }}>
          <div className="serif" style={{ fontSize: 20, marginBottom: 4 }}>
            What comes in each month
          </div>
          <div className="small" style={{ marginBottom: 10 }}>
            Money that landed in a Future or Emergency pot, by month.
          </div>
          <div className="card" style={{ padding: 16 }}>
            {months.every((m) => m.saved === 0) ? (
              <div className="body" style={{ textAlign: "center", padding: "12px 4px" }}>
                Nothing saved into these pots yet.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${months.length}, 1fr)`,
                  gap: 10,
                  alignItems: "end",
                  height: 130,
                }}
              >
                {months.map((m, i) => {
                  const h = (m.saved / monthMax) * 100
                  const isCurr = i === months.length - 1
                  return (
                    <div
                      key={m.month}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        height: "100%",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          maxWidth: 32,
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "flex-end",
                        }}
                      >
                        <div
                          style={{
                            height: `${h}%`,
                            background: "var(--green)",
                            borderRadius: 4,
                            opacity: isCurr ? 1 : 0.7,
                          }}
                        ></div>
                      </div>
                      <div
                        className="tiny"
                        style={{
                          fontWeight: isCurr ? 700 : 500,
                          color: isCurr ? "var(--ink)" : "var(--ink-3)",
                        }}
                      >
                        {m.month}
                      </div>
                      <div className="tiny" style={{ color: "var(--ink-3)" }}>
                        {fmtMoney(m.saved, currency)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "20px 0 8px" }}>
          <div className="serif" style={{ fontSize: 20, marginBottom: 4 }}>
            What&apos;s contributing
          </div>
          <div className="small" style={{ marginBottom: 10 }}>
            Every Future and Emergency pot&apos;s all-time balance.
          </div>
          <div className="card" style={{ padding: "10px 16px" }}>
            {contributors.length === 0 ? (
              <div className="body" style={{ padding: "12px 0", textAlign: "center" }}>
                No Future or Emergency pots with a balance yet.
              </div>
            ) : (
              contributors.map((b) => {
                const pct =
                  totalContributed > 0 ? (b.lifetimeBalance / totalContributed) * 100 : 0
                return (
                  <div key={b.id} className="flow-row">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        minWidth: 0,
                      }}
                    >
                      <span className="dot" style={{ background: dotBg(b.color) }}></span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {b.name}
                      </span>
                      <span className="tiny" style={{ color: "var(--ink-3)" }}>
                        {Math.round(pct)}%
                      </span>
                    </div>
                    <div
                      className="flow-bar"
                      style={{ width: `${Math.max(4, pct)}%` }}
                    ></div>
                    <div
                      className="num"
                      style={{ fontSize: 12, textAlign: "right", color: "var(--ink-2)" }}
                    >
                      {fmtMoney(b.lifetimeBalance, currency)}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </Sheet>
  )
}
