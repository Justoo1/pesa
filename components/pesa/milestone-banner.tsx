"use client"

import { useEffect, useState } from "react"
import { Icon } from "./icons"
import { fmtMoney } from "./format"
import type { Bucket } from "./types"

const THRESHOLDS = [
  1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000,
]
const SHOW_FOR_MS = 7 * 24 * 60 * 60 * 1000

type Milestone = {
  bucketId: string
  bucketName: string
  threshold: number
  key: string
}

function pickActive(buckets: Bucket[]): Milestone | null {
  // Best (highest threshold) crossed across savings-style pots, scoped per
  // bucket+threshold so each milestone runs on its own 7-day window.
  let best: Milestone | null = null
  for (const b of buckets) {
    if (b.kind !== "future" && b.kind !== "emergency") continue
    const balance = b.projection?.lifetimeBalance ?? 0
    if (balance <= 0) continue
    let crossed = 0
    for (const t of THRESHOLDS) {
      if (balance >= t) crossed = t
      else break
    }
    if (crossed === 0) continue
    if (!best || crossed > best.threshold) {
      best = {
        bucketId: b.id,
        bucketName: b.name,
        threshold: crossed,
        key: `pesa.milestone.${b.id}.${crossed}`,
      }
    }
  }
  return best
}

export function MilestoneBanner({
  buckets,
  currency,
}: {
  buckets: Bucket[]
  currency: string
}) {
  const candidate = pickActive(buckets)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!candidate) {
      setHidden(true)
      return
    }
    const now = Date.now()
    const raw = localStorage.getItem(candidate.key)
    if (!raw) {
      // First time crossing — stamp it and show.
      localStorage.setItem(candidate.key, String(now))
      setHidden(false)
      return
    }
    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || now - parsed > SHOW_FOR_MS) {
      setHidden(true)
    } else {
      setHidden(false)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [candidate])

  if (!candidate || hidden) return null

  const dismiss = () => {
    // Set the stamp to >7 days ago so the banner stays gone but the
    // user could still re-cross a *later* threshold and see a fresh one.
    localStorage.setItem(candidate.key, String(Date.now() - SHOW_FOR_MS - 1))
    setHidden(true)
  }

  return (
    <div style={{ padding: "12px 20px 0" }}>
      <div
        className="card"
        style={{
          padding: 14,
          background: "linear-gradient(160deg, #ECC0A8 0%, #C9714B 100%)",
          color: "#FFF8EB",
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
            background: "rgba(255,248,235,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="spark" size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="serif"
            style={{ fontSize: 18, lineHeight: 1.1 }}
          >
            {fmtMoney(candidate.threshold, currency)} sent to {candidate.bucketName}
          </div>
          <div className="tiny" style={{ opacity: 0.85, marginTop: 2 }}>
            Since you started. That&apos;s real.
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            background: "transparent",
            border: 0,
            color: "inherit",
            padding: 6,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            opacity: 0.85,
          }}
        >
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  )
}
