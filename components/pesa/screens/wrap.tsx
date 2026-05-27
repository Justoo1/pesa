"use client"

import { Icon } from "../icons"
import { fmtMoney } from "../format"
import type { AppState } from "../types"

function WrapStat({
  label,
  value,
  caption,
  tone,
}: {
  label: string
  value: string
  caption: string
  tone: "green" | "clay" | "gold"
}) {
  const colors = {
    green: { bg: "var(--green-tint)", fg: "var(--green-deep)" },
    clay: { bg: "var(--clay-soft)", fg: "var(--clay-deep)" },
    gold: { bg: "#F1E1B8", fg: "#6E4F12" },
  }[tone]
  return (
    <div style={{ background: colors.bg, color: colors.fg, padding: 14, borderRadius: 20 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          opacity: 0.8,
        }}
      >
        {label}
      </div>
      <div
        className="num"
        style={{ fontSize: 17, fontWeight: 700, marginTop: 4, lineHeight: 1 }}
      >
        {value}
      </div>
      <div className="tiny" style={{ color: colors.fg, opacity: 0.7, marginTop: 4 }}>
        {caption}
      </div>
    </div>
  )
}

export function WrapScreen({
  state,
  currency,
  userName,
  monthLabel,
}: {
  state: AppState
  currency: string
  userName: string
  monthLabel: string
}) {
  const totalAllocated = state.buckets.reduce((s, b) => s + b.allocated, 0)
  const saved = state.buckets
    .filter((b) => b.kind === "future")
    .reduce((s, b) => s + b.allocated, 0)
  const given = state.buckets
    .filter((b) => b.kind === "give" || b.kind === "people")
    .reduce((s, b) => s + b.allocated, 0)
  const lived = state.buckets
    .filter((b) => b.kind === "essential" || b.kind === "bills")
    .reduce((s, b) => s + b.allocated, 0)
  const fullCount = state.buckets.filter((b) => b.allocated >= b.target).length

  return (
    <>
      <div style={{ padding: "8px 20px 0" }}>
        <div
          className="tiny"
          style={{ fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          {monthLabel} · The Wrap
        </div>
        <div className="serif" style={{ fontSize: 30, lineHeight: 1.05 }}>
          Your month, <span className="italic">in flow.</span>
        </div>
      </div>

      <div style={{ padding: "14px 20px 0" }}>
        <div
          className="card"
          style={{
            padding: 22,
            position: "relative",
            overflow: "hidden",
            background: "linear-gradient(160deg, #C9714B 0%, #9F5234 100%)",
            color: "#FFF8EB",
          }}
        >
          <svg
            width="200"
            height="200"
            viewBox="0 0 200 200"
            style={{ position: "absolute", right: -50, bottom: -60, opacity: 0.18 }}
          >
            <circle cx="100" cy="100" r="90" fill="none" stroke="#FFF" strokeWidth="1" />
            <circle cx="100" cy="100" r="60" fill="none" stroke="#FFF" strokeWidth="1" />
            <circle cx="100" cy="100" r="30" fill="#FFF" />
          </svg>
          <div
            className="tiny"
            style={{
              color: "rgba(255,248,235,0.8)",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            You disbursed
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 4 }}>
            <span className="serif" style={{ fontSize: 18 }}>
              {currency}
            </span>
            <span className="serif" style={{ fontSize: 56, lineHeight: 1 }}>
              {totalAllocated.toLocaleString()}
            </span>
          </div>
          <div className="body" style={{ color: "rgba(255,248,235,0.9)", marginTop: 6 }}>
            across <strong style={{ color: "#FFF" }}>{state.buckets.length} pots</strong>, with{" "}
            <strong style={{ color: "#FFF" }}>{fullCount}</strong> filled to the brim. 🍯
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "12px 20px 0",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
        }}
      >
        <WrapStat
          label="Saved"
          value={fmtMoney(saved, currency)}
          caption="for tomorrow"
          tone="green"
        />
        <WrapStat
          label="Gave"
          value={fmtMoney(given, currency)}
          caption="to people & faith"
          tone="gold"
        />
        <WrapStat
          label="Lived"
          value={fmtMoney(lived, currency)}
          caption="on essentials"
          tone="clay"
        />
      </div>

      <div style={{ padding: "16px 20px 0" }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="serif" style={{ fontSize: 20, lineHeight: 1.1, marginBottom: 12 }}>
            Highlights for <span className="italic">{userName}</span>
          </div>
          <div className="row" style={{ padding: "10px 0" }}>
            <div className="row-icon sage">
              <Icon name="spark" size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>You hit Rent on day 3</div>
              <div className="tiny">Earliest you&apos;ve ever filled it. ✨</div>
            </div>
          </div>
          <div className="row">
            <div className="row-icon gold">
              <Icon name="trend" size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                Savings grew {fmtMoney(saved, currency)}
              </div>
              <div className="tiny">Your best Savings month since February.</div>
            </div>
          </div>
          <div className="row">
            <div className="row-icon rose">
              <Icon name="heart" size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Mom & Tithe: on time</div>
              <div className="tiny">Same week, every month — that&apos;s consistency.</div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "16px 20px 28px",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 8,
        }}
      >
        <button className="btn btn-primary btn-block">
          <Icon name="share" size={16} /> Share my wrap
        </button>
        <button className="btn btn-soft btn-icon" aria-label="History">
          <Icon name="history" size={18} />
        </button>
      </div>
    </>
  )
}
