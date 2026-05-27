"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Icon } from "./icons"
import { fmtMoney } from "./format"
import type { Bucket } from "./types"

/* ---------- Pot ---------- */
export function Pot({ pct = 0, size = 96 }: { pct?: number; size?: number }) {
  const fillHeight = Math.max(0, Math.min(100, pct)) * 0.82
  return (
    <div className="pot" style={{ width: size, height: size }}>
      <div className="pot-fill" style={{ height: `${fillHeight}%` }}></div>
      <div className="pot-shine"></div>
    </div>
  )
}

/* ---------- BucketCard ---------- */
export function BucketCard({
  bucket,
  onClick,
  currency,
}: {
  bucket: Bucket
  onClick: () => void
  currency: string
}) {
  const pct = bucket.target > 0 ? (bucket.allocated / bucket.target) * 100 : 0
  const done = bucket.allocated >= bucket.target
  return (
    <button
      className="card"
      onClick={onClick}
      style={{
        appearance: "none",
        border: 0,
        textAlign: "left",
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        cursor: "pointer",
        width: "100%",
        background: "var(--bg-card)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          className={`row-icon ${bucket.color}`}
          style={{ width: 32, height: 32, borderRadius: 10 }}
        >
          <Icon name={bucket.icon} size={16} />
        </div>
        {done && (
          <span className="chip chip-green" style={{ padding: "3px 8px", fontSize: 10 }}>
            <Icon name="check" size={11} /> Full
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div className="serif" style={{ fontSize: 20, lineHeight: 1, color: "var(--ink)" }}>
          {bucket.name}
        </div>
        <div className="num" style={{ fontSize: 12, color: "var(--ink-3)" }}>
          {fmtMoney(bucket.allocated, currency)}{" "}
          <span style={{ color: "var(--ink-3)", opacity: 0.5 }}>
            / {fmtMoney(bucket.target, currency)}
          </span>
        </div>
      </div>
      <div className="bucket-bar">
        <span
          style={{
            width: `${Math.min(100, pct)}%`,
            background: done ? "var(--green)" : "var(--clay)",
          }}
        ></span>
      </div>
    </button>
  )
}

/* ---------- Bottom Tab Bar ---------- */
export type TabId = "home" | "insights" | "wrap" | "settings"

export function TabBar({
  current,
  onChange,
  onPlus,
}: {
  current: TabId
  onChange: (t: TabId) => void
  onPlus: () => void
}) {
  const tabs: Array<{ id: string; label: string; icon: Parameters<typeof Icon>[0]["name"]; isFab?: boolean }> = [
    { id: "home", label: "Home", icon: "home" },
    { id: "insights", label: "Insights", icon: "trend" },
    { id: "plus", label: "Disburse", icon: "send", isFab: true },
    { id: "wrap", label: "Wrap", icon: "spark" },
    { id: "settings", label: "More", icon: "settings" },
  ]
  return (
    <nav className="tabbar">
      {tabs.map((t) => {
        if (t.isFab) {
          return (
            <button
              key={t.id}
              className="tab tab-fab"
              onClick={onPlus}
              aria-label="New disbursement"
            >
              <div className="fab">
                <Icon name="send" size={22} />
              </div>
              <span className="tab-label">Disburse</span>
            </button>
          )
        }
        const active = current === t.id
        return (
          <button
            key={t.id}
            className="tab"
            aria-current={active ? "page" : undefined}
            onClick={() => onChange(t.id as TabId)}
          >
            <Icon name={t.icon} size={22} />
            <span>{t.label}</span>
            <span className="tab-dot"></span>
          </button>
        )
      })}
    </nav>
  )
}

/* ---------- Ring ---------- */
export function Ring({
  pct = 0,
  size = 60,
  stroke = 8,
  color = "var(--green)",
  track = "rgba(33,26,18,0.08)",
}: {
  pct?: number
  size?: number
  stroke?: number
  color?: string
  track?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = (pct / 100) * c
  return (
    <svg className="ring" width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 600ms cubic-bezier(0.2,0.8,0.2,1)" }}
      />
    </svg>
  )
}

/* ---------- Sheet ---------- */
export function Sheet({
  open,
  onClose,
  children,
  height,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  height?: string
}) {
  if (!open) return null
  return (
    <>
      <div className="sheet-scrim" onClick={onClose}></div>
      <div className="sheet" style={height ? { height } : undefined}>
        <div className="sheet-grabber" onClick={onClose}></div>
        {children}
      </div>
    </>
  )
}

/* ---------- Toast ---------- */
export function Toast({ children }: { children: ReactNode }) {
  return <div className="toast">{children}</div>
}

/* ---------- Animated counter ---------- */
export function Counter({
  value,
  prefix = "",
  className = "",
}: {
  value: number
  prefix?: string
  className?: string
}) {
  const [display, setDisplay] = useState(value)
  const prevValue = useRef(value)
  useEffect(() => {
    const start = prevValue.current
    const end = value
    if (start === end) return
    const dur = 600
    const startTime = performance.now()
    let raf: number
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / dur)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = Math.round(start + (end - start) * eased)
      setDisplay(v)
      if (t < 1) raf = requestAnimationFrame(tick)
      else prevValue.current = end
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return (
    <span className={className}>
      {prefix}
      {display.toLocaleString("en-US")}
    </span>
  )
}

/* ---------- Mini stat tile ---------- */
export function MiniStat({
  label,
  value,
  tint,
}: {
  label: string
  value: string
  tint: "green" | "clay" | "gold"
}) {
  const colors = {
    green: { bg: "var(--green-tint)", fg: "var(--green-deep)" },
    clay: { bg: "var(--clay-soft)", fg: "var(--clay-deep)" },
    gold: { bg: "#F1E1B8", fg: "#6E4F12" },
  }[tint]
  return (
    <div style={{ background: colors.bg, borderRadius: 16, padding: "10px 12px" }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: colors.fg,
          opacity: 0.75,
        }}
      >
        {label}
      </div>
      <div
        className="num"
        style={{ fontSize: 16, fontWeight: 600, color: colors.fg, marginTop: 2 }}
      >
        {value}
      </div>
    </div>
  )
}
