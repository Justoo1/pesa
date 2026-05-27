"use client"

import { Icon } from "../icons"
import { Sheet } from "../ui"

const APP_VERSION = "v0.2"
const TAGLINE = "Every cedi, a place to land."

export function AboutSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  if (!open) return null
  return (
    <Sheet open={true} onClose={onClose} height="58%">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 4px 12px",
        }}
      >
        <button
          className="btn btn-ghost btn-icon"
          onClick={onClose}
          aria-label="Close"
        >
          <Icon name="close" size={18} />
        </button>
        <div className="serif" style={{ fontSize: 22 }}>
          About Pesa
        </div>
        <div style={{ width: 44 }}></div>
      </div>

      <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card" style={{ padding: 18 }}>
          <div className="tiny" style={{ fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Pesa · {APP_VERSION}
          </div>
          <div
            className="serif"
            style={{ fontSize: 24, lineHeight: 1.05, marginTop: 6, color: "var(--ink)" }}
          >
            {TAGLINE}
          </div>
          <div className="body" style={{ marginTop: 10 }}>
            Move your salary into pots — Rent, Mom, Savings, Tithe — and watch each one
            fill. Pesa tracks what&apos;s left to disburse, what&apos;s already where it
            should be, and how it all adds up over months.
          </div>
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div className="tiny" style={{ fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Built with
          </div>
          <div className="body" style={{ marginTop: 6 }}>
            Next.js · React · Prisma · Neon Postgres · Auth.js
          </div>
        </div>
      </div>
    </Sheet>
  )
}
