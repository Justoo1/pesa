"use client"

import { Icon } from "../icons"
import { fmtMoney } from "../format"
import { BucketCard, Counter, MiniStat, type TabId } from "../ui"
import type { AppState } from "../types"
import { signOutAction } from "@/app/actions/auth"

export function HomeScreen({
  state,
  onOpenBucket,
  onOpenDisburse,
  onGoTo,
  currency,
  userName,
  monthLabel,
}: {
  state: AppState
  onOpenBucket: (id: string) => void
  onOpenDisburse: () => void
  onGoTo: (t: TabId) => void
  currency: string
  userName: string
  monthLabel: string
}) {
  const { buckets, salary } = state
  const totalAllocated = buckets.reduce((s, b) => s + b.allocated, 0)
  const totalTarget = buckets.reduce((s, b) => s + b.target, 0)
  const remaining = salary - totalAllocated
  const pctDone = salary > 0 ? (totalAllocated / salary) * 100 : 0
  const bucketsFull = buckets.filter((b) => b.allocated >= b.target).length

  return (
    <>
      <div
        style={{
          padding: "8px 20px 4px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="tiny"
            style={{
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {monthLabel} · Disbursement
          </div>
          <div
            className="serif"
            style={{ fontSize: 30, lineHeight: 1.05, color: "var(--ink)" }}
          >
            Morning,&nbsp;<span className="italic">{userName}.</span>
          </div>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="btn btn-ghost btn-icon"
            aria-label="Sign out"
            title="Sign out"
          >
            <Icon name="logout" size={18} />
          </button>
        </form>
      </div>

      <div style={{ padding: "16px 20px 4px" }}>
        <div
          className="card"
          style={{
            background: "linear-gradient(160deg, #2A3A22 0%, #3D5234 70%, #4A6240 100%)",
            color: "var(--bg-app)",
            padding: 20,
            borderRadius: 28,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <svg
            width="180"
            height="180"
            viewBox="0 0 180 180"
            style={{ position: "absolute", right: -40, top: -50, opacity: 0.18 }}
          >
            <circle cx="90" cy="90" r="80" fill="none" stroke="#B5C29A" strokeWidth="1.2" />
            <circle cx="90" cy="90" r="56" fill="none" stroke="#B5C29A" strokeWidth="1.2" />
            <circle cx="90" cy="90" r="32" fill="#B5C29A" opacity="0.6" />
          </svg>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span
              style={{ width: 8, height: 8, borderRadius: 999, background: "#B5C29A" }}
            ></span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#DDE5C8",
              }}
            >
              Left to disburse
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span className="serif" style={{ fontSize: 18, color: "#DDE5C8" }}>
              {currency}
            </span>
            <span
              className="serif"
              style={{ fontSize: 64, lineHeight: 1, color: "#F4EBD9", fontWeight: 400 }}
            >
              <Counter value={Math.max(0, remaining)} />
            </span>
          </div>

          <div
            style={{
              marginTop: 14,
              height: 6,
              background: "rgba(180,194,154,0.25)",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min(100, pctDone)}%`,
                height: "100%",
                background: "linear-gradient(90deg, #ECC0A8, #C9714B)",
                transition: "width 600ms cubic-bezier(0.2,0.8,0.2,1)",
              }}
            ></div>
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
            }}
          >
            <span style={{ color: "#DDE5C8" }}>
              <span className="num" style={{ color: "#F4EBD9", fontWeight: 600 }}>
                {fmtMoney(totalAllocated, currency)}
              </span>{" "}
              sent of {fmtMoney(salary, currency)}
            </span>
            <span style={{ color: "#DDE5C8" }}>
              {bucketsFull}/{buckets.length} pots full
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 8,
              marginTop: 16,
            }}
          >
            <button className="btn btn-clay btn-block" onClick={onOpenDisburse}>
              <Icon name="send" size={16} /> Send to a pot
            </button>
            <button
              className="btn btn-soft btn-icon"
              style={{
                background: "rgba(244,235,217,0.1)",
                color: "#F4EBD9",
                boxShadow: "inset 0 0 0 1px rgba(244,235,217,0.2)",
              }}
              onClick={() => onGoTo("wrap")}
              aria-label="Monthly wrap"
            >
              <Icon name="spark" size={18} />
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "14px 20px 0",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
        }}
      >
        <MiniStat label="Salary" value={fmtMoney(salary, currency)} tint="green" />
        <MiniStat label="Disbursed" value={fmtMoney(totalAllocated, currency)} tint="clay" />
        <MiniStat
          label="Spendable"
          value={fmtMoney(Math.max(0, salary - totalTarget), currency)}
          tint="gold"
        />
      </div>

      <div
        style={{
          padding: "20px 20px 8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div className="serif" style={{ fontSize: 22, color: "var(--ink)" }}>
          Your pots
        </div>
        <button
          className="chip"
          style={{ background: "transparent", color: "var(--ink-2)" }}
          onClick={() => onGoTo("settings")}
        >
          <Icon name="edit" size={12} /> Edit
        </button>
      </div>
      {buckets.length === 0 ? (
        <div style={{ padding: "0 20px 28px" }}>
          <div
            className="card"
            style={{
              padding: 22,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              className="serif"
              style={{ fontSize: 22, lineHeight: 1.1, color: "var(--ink)" }}
            >
              No pots yet
            </div>
            <div className="body" style={{ maxWidth: 280 }}>
              Create your first pot to start carving up your salary.
            </div>
            <button
              className="btn btn-green"
              style={{ marginTop: 8 }}
              onClick={() => onGoTo("settings")}
            >
              <Icon name="plus" size={16} /> Create a pot
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: "0 20px 28px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          {buckets.map((b) => (
            <BucketCard
              key={b.id}
              bucket={b}
              onClick={() => onOpenBucket(b.id)}
              currency={currency}
            />
          ))}
        </div>
      )}
    </>
  )
}
