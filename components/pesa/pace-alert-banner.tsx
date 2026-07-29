"use client"

import { useEffect, useState } from "react"
import { Icon } from "./icons"
import { fmtMoney } from "./format"
import type { Bucket } from "./types"

const SHOW_FOR_MS = 3 * 24 * 60 * 60 * 1000

type PaceAlert = {
  bucketId: string
  bucketName: string
  overBy: number
  key: string
}

function ymOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function pickWorst(buckets: Bucket[], now: Date): PaceAlert | null {
  const year = now.getFullYear()
  const month = now.getMonth()
  const startOfMonth = new Date(year, month, 1)
  const daysElapsed =
    Math.floor((now.getTime() - startOfMonth.getTime()) / 86_400_000) + 1
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate()

  let worst: PaceAlert | null = null
  let worstRatio = 0
  for (const b of buckets) {
    // Only pots you spend down against a cap — accumulation-style pots
    // (future/emergency/debt) aren't "on pace to blow through" anything.
    if (b.kind === "future" || b.kind === "emergency" || b.kind === "debt") continue
    if (b.target <= 0 || b.spent <= 0) continue

    const periodEndDay = b.kind === "bills" && b.dueDayOfMonth ? b.dueDayOfMonth : lastDayOfMonth
    if (daysElapsed > periodEndDay) continue // period already over

    const projected = (b.spent / daysElapsed) * periodEndDay
    if (projected <= b.target) continue
    const overBy = projected - b.target
    const ratio = overBy / b.target
    if (ratio > worstRatio) {
      worstRatio = ratio
      worst = {
        bucketId: b.id,
        bucketName: b.name,
        overBy,
        key: `pesa.pace.${b.id}.${ymOf(now)}`,
      }
    }
  }
  return worst
}

export function PaceAlertBanner({ buckets, currency }: { buckets: Bucket[]; currency: string }) {
  const [now] = useState(() => new Date())
  const candidate = pickWorst(buckets, now)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!candidate) {
      setHidden(true)
      return
    }
    const stamp = Date.now()
    const raw = localStorage.getItem(candidate.key)
    if (!raw) {
      localStorage.setItem(candidate.key, String(stamp))
      setHidden(false)
      return
    }
    const parsed = Number(raw)
    setHidden(Number.isFinite(parsed) && stamp - parsed > SHOW_FOR_MS)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [candidate])

  if (!candidate || hidden) return null

  const dismiss = () => {
    localStorage.setItem(candidate.key, String(Date.now() - SHOW_FOR_MS - 1))
    setHidden(true)
  }

  return (
    <div style={{ padding: "12px 20px 0" }}>
      <div
        className="card"
        style={{
          padding: 14,
          background: "var(--clay-soft)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: "rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="info" size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="serif" style={{ fontSize: 16, lineHeight: 1.2, color: "var(--clay-deep)" }}>
            {candidate.bucketName} is on pace to go over
          </div>
          <div className="tiny" style={{ marginTop: 2, color: "var(--clay-deep)" }}>
            At this rate, about {fmtMoney(Math.round(candidate.overBy), currency)} over target.
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            background: "transparent",
            border: 0,
            color: "var(--clay-deep)",
            padding: 6,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            opacity: 0.7,
          }}
        >
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  )
}
