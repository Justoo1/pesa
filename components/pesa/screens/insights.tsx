"use client"

import { useState } from "react"
import { fmtMoney } from "../format"
import { Ring } from "../ui"
import type { AppState, BucketColor, MonthRow } from "../types"

export function InsightsScreen({
  state,
  currency,
  months,
  netWorth,
}: {
  state: AppState
  currency: string
  months: MonthRow[]
  netWorth: number
}) {
  const [view, setView] = useState<"saved" | "all">("all")
  const max =
    view === "saved"
      ? Math.max(1, ...months.map((m) => m.saved))
      : Math.max(1, ...months.map((m) => m.total))
  const noData = months.every((m) => m.total === 0)
  const priorMonths = months.slice(0, -1)
  const priorWithData = priorMonths.filter((m) => m.saved > 0)
  const avgSaved =
    priorWithData.length > 0
      ? Math.round(
          priorWithData.reduce((s, m) => s + m.saved, 0) / priorWithData.length,
        )
      : 0
  const currMonth = months[months.length - 1] ?? { saved: 0, gave: 0, lived: 0, total: 0 }
  const savingsRate =
    currMonth.total > 0 ? Math.round((currMonth.saved / currMonth.total) * 100) : 0
  const prevMonth = months[months.length - 2] ?? { saved: 0, gave: 0, lived: 0, total: 0 }
  const trendDelta = currMonth.saved - prevMonth.saved

  // Only show pots that have actually received money this month, sorted by
  // how much landed in them (largest first).
  const flows = state.buckets
    .filter((b) => b.allocated > 0)
    .slice()
    .sort((a, b) => b.allocated - a.allocated)
    .slice(0, 6)
  const flowMax = Math.max(1, ...flows.map((f) => f.allocated))

  const flowBarClass = (c: BucketColor) =>
    ({ clay: "clay", green: "", gold: "gold", rose: "rose", sage: "sage" }[c])
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

  const noTxnsThisMonth = currMonth.total === 0

  return (
    <>
      <div style={{ padding: "8px 20px 0" }}>
        <div
          className="tiny"
          style={{ fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          Insights
        </div>
        <div className="serif" style={{ fontSize: 30, lineHeight: 1.05 }}>
          {noTxnsThisMonth && noData ? (
            <>Your <span className="italic">first month.</span></>
          ) : (
            <>You&apos;re <span className="italic">growing.</span></>
          )}
        </div>
      </div>

      {noTxnsThisMonth && noData && (
        <div style={{ padding: "16px 20px 0" }}>
          <div
            className="card"
            style={{
              padding: 16,
              background: "var(--green-tint)",
              color: "var(--green-deep)",
            }}
          >
            <div className="serif" style={{ fontSize: 20, lineHeight: 1.1 }}>
              Disburse a transfer to start the chart.
            </div>
            <div className="small" style={{ marginTop: 6 }}>
              Move some salary into a pot on Home. Insights, trends and the
              wrap fill in as the month unfolds.
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: "16px 20px 0" }}>
        <div
          className="card"
          style={{ padding: 18, display: "flex", alignItems: "center", gap: 16 }}
        >
          <div style={{ position: "relative" }}>
            <Ring pct={savingsRate} size={80} stroke={10} color="var(--green)" />
            <div
              style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}
            >
              <div>
                <div
                  className="num"
                  style={{ fontSize: 22, fontWeight: 600, lineHeight: 1, textAlign: "center" }}
                >
                  {savingsRate}
                  <span style={{ fontSize: 12, color: "var(--ink-3)" }}>%</span>
                </div>
                <div className="tiny" style={{ textAlign: "center" }}>
                  saved
                </div>
              </div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="serif" style={{ fontSize: 18, lineHeight: 1.1, color: "var(--ink)" }}>
              This month&apos;s savings rate
            </div>
            <div className="small" style={{ marginTop: 4 }}>
              {trendDelta >= 0 ? (
                <span style={{ color: "var(--green-deep)", fontWeight: 600 }}>
                  ↑ {fmtMoney(trendDelta, currency)}
                </span>
              ) : (
                <span style={{ color: "var(--clay-deep)", fontWeight: 600 }}>
                  ↓ {fmtMoney(Math.abs(trendDelta), currency)}
                </span>
              )}{" "}
              vs. last month
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 20px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div className="serif" style={{ fontSize: 22 }}>
            6-month flow
          </div>
          <div className="seg">
            <button
              className={view === "saved" ? "on" : ""}
              onClick={() => setView("saved")}
            >
              Saved
            </button>
            <button
              className={view === "all" ? "on" : ""}
              onClick={() => setView("all")}
            >
              All
            </button>
          </div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          {noData && (
            <div
              className="body"
              style={{ textAlign: "center", padding: "12px 4px" }}
            >
              Disburse a few transfers to see your trends.
            </div>
          )}
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
              const savedH = (m.saved / max) * 100
              const giveH = (m.gave / max) * 100
              const liveH = (m.lived / max) * 100
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
                      gap: 2,
                    }}
                  >
                    {view === "all" && (
                      <>
                        <div
                          style={{
                            height: `${liveH}%`,
                            background: "var(--clay-soft)",
                            borderRadius: "4px 4px 0 0",
                            opacity: isCurr ? 1 : 0.7,
                          }}
                        ></div>
                        <div
                          style={{
                            height: `${giveH}%`,
                            background: "var(--gold)",
                            opacity: isCurr ? 1 : 0.7,
                          }}
                        ></div>
                      </>
                    )}
                    <div
                      style={{
                        height: `${savedH}%`,
                        background: "var(--green)",
                        borderRadius:
                          view === "saved" ? "4px 4px 4px 4px" : "0 0 4px 4px",
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
                </div>
              )
            })}
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 12,
              fontSize: 11,
              color: "var(--ink-3)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span className="dot" style={{ background: "var(--green)" }}></span> Saved
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span className="dot" style={{ background: "var(--gold)" }}></span> Gave
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span className="dot" style={{ background: "var(--clay-soft)" }}></span> Lived
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 20px 0" }}>
        <div className="serif" style={{ fontSize: 22, marginBottom: 10 }}>
          Where it went
        </div>
        <div className="card" style={{ padding: "10px 16px" }}>
          {flows.length === 0 ? (
            <div className="body" style={{ padding: "12px 0", textAlign: "center" }}>
              No disbursements yet this month.
            </div>
          ) : (
            flows.map((b) => {
              const w = Math.max(8, (b.allocated / flowMax) * 100)
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
                  </div>
                  <div
                    className={`flow-bar ${flowBarClass(b.color)}`}
                    style={{ width: `${w}%` }}
                  ></div>
                  <div
                    className="num"
                    style={{ fontSize: 12, textAlign: "right", color: "var(--ink-2)" }}
                  >
                    {fmtMoney(b.allocated, currency)}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div style={{ padding: "20px 20px 28px" }}>
        <div
          className="card"
          style={{
            padding: 16,
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
      </div>
    </>
  )
}
