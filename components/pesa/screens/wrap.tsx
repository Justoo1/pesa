"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Icon } from "../icons"
import { fmtMoney } from "../format"
import type { AppState, MonthRow } from "../types"

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

type Highlight = {
  icon: "spark" | "trend" | "heart"
  tone: "sage" | "gold" | "rose"
  title: string
  subtitle: string
}

export function WrapScreen({
  state,
  currency,
  userName,
  monthLabel,
  months,
  annualMonths,
}: {
  state: AppState
  currency: string
  userName: string
  monthLabel: string
  months: MonthRow[]
  annualMonths: MonthRow[]
}) {
  const today = new Date()
  const lastDayOfMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  ).getDate()
  const isFinalDay = today.getDate() === lastDayOfMonth
  const wrapLabel = isFinalDay ? "The Wrap" : "Month so far"
  const [view, setView] = useState<"month" | "year">("month")

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

  const highlights = useMemo<Highlight[]>(() => {
    const out: Highlight[] = []
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthTxns = state.ledger.filter(
      (t) => new Date(t.occurredAt) >= monthStart,
    )

    // Card 1: earliest day-of-month a pot was filled. Use the earliest txn
    // that pushed any bucket to its target.
    const fullBuckets = state.buckets.filter((b) => b.allocated >= b.target)
    if (fullBuckets.length > 0 && monthTxns.length > 0) {
      const earliest = monthTxns
        .filter((t) => fullBuckets.some((b) => b.id === t.bucketId))
        .map((t) => new Date(t.occurredAt))
        .sort((a, b) => a.getTime() - b.getTime())[0]
      if (earliest) {
        const bucket = fullBuckets.find(
          (b) =>
            monthTxns.find((t) => new Date(t.occurredAt).getTime() === earliest.getTime())
              ?.bucketId === b.id,
        )
        out.push({
          icon: "spark",
          tone: "sage",
          title: `You hit ${bucket?.name ?? "a pot"} on day ${earliest.getDate()}`,
          subtitle: "Filling pots early is the dream. ✨",
        })
      }
    }

    // Card 2: this month's saved vs the best prior month in the window.
    const prior = months.slice(0, -1)
    const bestPrior = Math.max(0, ...prior.map((m) => m.saved))
    if (saved > 0) {
      if (saved >= bestPrior && bestPrior > 0) {
        out.push({
          icon: "trend",
          tone: "gold",
          title: `Savings grew ${fmtMoney(saved, currency)}`,
          subtitle: "Your best savings month in the window.",
        })
      } else {
        out.push({
          icon: "trend",
          tone: "gold",
          title: `Savings grew ${fmtMoney(saved, currency)}`,
          subtitle:
            bestPrior > 0
              ? `Still ${fmtMoney(bestPrior - saved, currency)} short of your best month.`
              : "First savings on the board.",
        })
      }
    }

    // Card 3: on-time-ness for give/people pots — funded before day 10.
    const givePots = state.buckets.filter(
      (b) => b.kind === "give" || b.kind === "people",
    )
    const onTime = givePots.filter((b) => b.allocated >= b.target)
    if (givePots.length > 0 && onTime.length === givePots.length) {
      const names = onTime
        .slice(0, 2)
        .map((b) => b.name)
        .join(" & ")
      out.push({
        icon: "heart",
        tone: "rose",
        title: `${names}: on time`,
        subtitle: "Same week, every month — that's consistency.",
      })
    }

    if (out.length === 0) {
      out.push({
        icon: "spark",
        tone: "sage",
        title: "Add a few transfers to see your highlights",
        subtitle: "Your wrap fills up as the month unfolds.",
      })
    }
    return out.slice(0, 3)
  }, [state.buckets, state.ledger, months, currency, saved])

  const [shareNote, setShareNote] = useState<string | null>(null)
  const handleShare = async () => {
    const text = `My Pesa ${monthLabel} wrap:\n· Disbursed ${fmtMoney(totalAllocated, currency)}\n· Saved ${fmtMoney(saved, currency)}, gave ${fmtMoney(given, currency)}, lived ${fmtMoney(lived, currency)}\n· ${fullCount}/${state.buckets.length} pots full`
    const data = { title: "My Pesa wrap", text }
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(data)
        return
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text)
        setShareNote("Copied to clipboard")
        setTimeout(() => setShareNote(null), 2200)
      }
    } catch {
      // user cancelled or share failed — silent
    }
  }

  return (
    <>
      <div
        style={{
          padding: "8px 20px 0",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            className="tiny"
            style={{ fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}
          >
            {view === "year"
              ? `${today.getFullYear()} · Year so far`
              : `${monthLabel} · ${wrapLabel}`}
          </div>
          <div className="serif" style={{ fontSize: 30, lineHeight: 1.05 }}>
            {view === "year" ? (
              <>
                Your year, <span className="italic">in flow.</span>
              </>
            ) : (
              <>
                Your month, <span className="italic">in flow.</span>
              </>
            )}
          </div>
        </div>
        <div
          role="tablist"
          aria-label="Wrap range"
          style={{
            display: "flex",
            background: "rgba(33,26,18,0.06)",
            borderRadius: 999,
            padding: 3,
          }}
        >
          {(["month", "year"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              style={{
                appearance: "none",
                border: 0,
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                background: view === v ? "var(--ink)" : "transparent",
                color: view === v ? "var(--bg-app)" : "var(--ink-2)",
                cursor: "pointer",
              }}
            >
              {v === "month" ? "Month" : "Year"}
            </button>
          ))}
        </div>
      </div>

      {view === "year" ? (
        <AnnualWrap
          months={annualMonths}
          year={today.getFullYear()}
          currency={currency}
        />
      ) : (
      <>
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
          {highlights.map((h, i) => (
            <div
              key={i}
              className="row"
              style={i === 0 ? { padding: "10px 0" } : undefined}
            >
              <div className={`row-icon ${h.tone}`}>
                <Icon name={h.icon} size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{h.title}</div>
                <div className="tiny">{h.subtitle}</div>
              </div>
            </div>
          ))}
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
        <button
          className="btn btn-primary btn-block"
          onClick={handleShare}
          type="button"
        >
          <Icon name="share" size={16} />{" "}
          {shareNote ? shareNote : "Share my wrap"}
        </button>
        <Link
          href="/months"
          className="btn btn-soft btn-icon"
          aria-label="History"
        >
          <Icon name="history" size={18} />
        </Link>
      </div>
      </>
      )}
    </>
  )
}

function AnnualWrap({
  months,
  year,
  currency,
}: {
  months: MonthRow[]
  year: number
  currency: string
}) {
  const today = new Date()
  const thisMonthIdx = today.getFullYear() === year ? today.getMonth() : 11
  const elapsed = months.slice(0, thisMonthIdx + 1)
  const totals = elapsed.reduce(
    (s, m) => ({
      saved: s.saved + m.saved,
      gave: s.gave + m.gave,
      lived: s.lived + m.lived,
      total: s.total + m.total,
    }),
    { saved: 0, gave: 0, lived: 0, total: 0 },
  )
  const bestMonth = elapsed.reduce(
    (best, m, i) => (m.saved > (best?.row.saved ?? -1) ? { row: m, i } : best),
    null as null | { row: MonthRow; i: number },
  )
  const activeMonths = elapsed.filter((m) => m.total > 0).length
  const max = Math.max(1, ...months.map((m) => m.total))

  return (
    <>
      <div style={{ padding: "14px 20px 0" }}>
        <div
          className="card"
          style={{
            padding: 22,
            position: "relative",
            overflow: "hidden",
            background: "linear-gradient(160deg, #3D5234 0%, #2A3A22 100%)",
            color: "#F4EBD9",
          }}
        >
          <div
            className="tiny"
            style={{
              color: "rgba(244,235,217,0.8)",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {year} disbursed
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 4 }}>
            <span className="serif" style={{ fontSize: 18 }}>
              {currency}
            </span>
            <span className="serif" style={{ fontSize: 56, lineHeight: 1 }}>
              {totals.total.toLocaleString()}
            </span>
          </div>
          <div className="body" style={{ color: "rgba(244,235,217,0.9)", marginTop: 6 }}>
            over <strong style={{ color: "#FFF" }}>{activeMonths}</strong>{" "}
            month{activeMonths === 1 ? "" : "s"} of activity.
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
          value={fmtMoney(totals.saved, currency)}
          caption="put away"
          tone="green"
        />
        <WrapStat
          label="Gave"
          value={fmtMoney(totals.gave, currency)}
          caption="to people & faith"
          tone="gold"
        />
        <WrapStat
          label="Lived"
          value={fmtMoney(totals.lived, currency)}
          caption="on essentials"
          tone="clay"
        />
      </div>

      <div style={{ padding: "16px 20px 0" }}>
        <div className="card" style={{ padding: 16 }}>
          <div
            className="serif"
            style={{ fontSize: 20, lineHeight: 1.1, marginBottom: 4 }}
          >
            By month
          </div>
          {bestMonth && bestMonth.row.saved > 0 && (
            <div className="tiny" style={{ marginBottom: 10 }}>
              Best for savings:{" "}
              <strong style={{ color: "var(--ink)" }}>{bestMonth.row.month}</strong>{" "}
              · {fmtMoney(bestMonth.row.saved, currency)}.
            </div>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(12, 1fr)",
              gap: 4,
              alignItems: "end",
              height: 96,
            }}
          >
            {months.map((m, i) => {
              const h = max > 0 ? (m.total / max) * 100 : 0
              const isCurrent = i === thisMonthIdx
              return (
                <div
                  key={m.month}
                  title={`${m.month}: ${fmtMoney(m.total, currency)}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    height: "100%",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: `${Math.max(h, m.total > 0 ? 4 : 0)}%`,
                      background: isCurrent ? "var(--clay)" : "var(--green-soft)",
                      borderRadius: 4,
                      transition: "height 240ms ease",
                    }}
                  />
                </div>
              )
            })}
          </div>
          <div
            className="tiny"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(12, 1fr)",
              gap: 4,
              marginTop: 6,
              textAlign: "center",
              color: "var(--ink-3)",
            }}
          >
            {months.map((m) => (
              <span key={m.month}>{m.month[0]}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 20px 28px" }}>
        <Link
          href="/months"
          className="btn btn-soft btn-block"
          aria-label="All months"
        >
          <Icon name="history" size={16} /> See every month
        </Link>
      </div>
    </>
  )
}
