"use client"

import { Ring } from "./ui"

function scoreColor(score: number): string {
  if (score >= 70) return "var(--green)"
  if (score >= 40) return "var(--gold)"
  return "var(--clay)"
}

export function FinancialHealthCard({
  score,
  savingsScore,
  cushionScore,
  debtScore,
}: {
  score: number
  savingsScore: number
  cushionScore: number
  debtScore: number
}) {
  return (
    <div
      className="card"
      style={{ padding: 18, display: "flex", alignItems: "center", gap: 16 }}
    >
      <div style={{ position: "relative" }}>
        <Ring pct={score} size={80} stroke={10} color={scoreColor(score)} />
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          <div>
            <div
              className="num"
              style={{ fontSize: 22, fontWeight: 600, lineHeight: 1, textAlign: "center" }}
            >
              {score}
            </div>
            <div className="tiny" style={{ textAlign: "center" }}>
              health
            </div>
          </div>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div className="serif" style={{ fontSize: 18, lineHeight: 1.1, color: "var(--ink)" }}>
          Financial health
        </div>
        <div
          className="small"
          style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}
        >
          <span>Savings {savingsScore}</span>
          <span style={{ color: "var(--ink-3)" }}>·</span>
          <span>Cushion {cushionScore}</span>
          <span style={{ color: "var(--ink-3)" }}>·</span>
          <span>Debt {debtScore}</span>
        </div>
      </div>
    </div>
  )
}
