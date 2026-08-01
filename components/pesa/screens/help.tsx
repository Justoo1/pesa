"use client"

import { useState } from "react"
import { Icon } from "../icons"
import { Sheet } from "../ui"

type Topic = { title: string; body: string }

const TOPICS: Topic[] = [
  {
    title: "Pots & kinds",
    body:
      "A pot is a place for a slice of your salary to land — Rent, Mom, Savings, Tithe. Each pot has a target (its goal), an allocated amount (what's landed in it so far this month), and spent (what you've taken back out of it). Kinds shape how a pot behaves: Essential and Bills are things you spend down each month; Future and Emergency build up savings over time; Debt tracks a balance you're paying off; Give and People are for money that goes to others.",
  },
  {
    title: "Payday & the bank",
    body:
      "Add your income sources in Settings — their total becomes your salary. On your payday (set it in Settings → Notifications), that amount is credited to your Bank balance automatically. Sending money to a pot debits the bank; adding funds or logging a personal spend on the Bank tab moves money too. The bank balance is a real running ledger, not a monthly reset.",
  },
  {
    title: "Debt pots",
    body:
      "Create a pot with kind \"Debt\" and set its target to the total you owe. Every payment you make toward it (via \"Make a payment\" on the pot) counts toward paying it off — the pot shows how much you've paid and how much is still owed, plus a payoff-date estimate based on your recent pace.",
  },
  {
    title: "Carry-over",
    body:
      "By default, a pot's progress resets to zero at the start of each month. Turn on \"Carry over leftover\" when editing a pot to keep any unspent balance instead of losing it — useful for a pot where you don't always spend the full amount, like Groceries.",
  },
  {
    title: "Insights & financial health score",
    body:
      "The Insights tab shows your savings rate, a 6-month flow chart, and a financial health score — a 0–100 blend of your savings rate, how many months of essentials your Emergency pot could cover, and how much debt you're carrying relative to your salary.",
  },
  {
    title: "Net worth",
    body:
      "Net worth adds up the all-time balance of every Future, Emergency, and Debt pot — tap the net worth card on Insights to see what's contributing and how much has come in each month.",
  },
  {
    title: "More things worth knowing",
    body:
      "Round-ups send the spare change from a top-up into your first Future pot. \"Replay last month\" on Home re-sends last month's amounts to the same pots in one tap. \"Reset this month\" in Settings clears this month's transactions and pot progress — it can't be undone.",
  },
]

function AccordionRow({ topic }: { topic: Topic }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          appearance: "none",
          border: 0,
          background: "transparent",
          textAlign: "left",
          cursor: "pointer",
          padding: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{topic.title}</span>
        <span style={{ transform: open ? "rotate(90deg)" : undefined, transition: "transform 150ms ease" }}>
          <Icon name="chevron" size={14} />
        </span>
      </button>
      {open && (
        <div className="body" style={{ padding: "0 14px 14px" }}>
          {topic.body}
        </div>
      )}
    </div>
  )
}

export function HelpSheet({
  open,
  onClose,
  onReplayTour,
}: {
  open: boolean
  onClose: () => void
  onReplayTour: () => void
}) {
  if (!open) return null
  return (
    <Sheet open={true} onClose={onClose} height="85%">
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
          Help &amp; tutorials
        </div>
        <div style={{ width: 44 }}></div>
      </div>

      <div
        style={{
          overflowY: "auto",
          flex: 1,
          minHeight: 0,
          padding: "0 4px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {TOPICS.map((t) => (
          <AccordionRow key={t.title} topic={t} />
        ))}
      </div>

      <button
        className="btn btn-green btn-block"
        style={{ marginTop: 14 }}
        onClick={() => {
          onClose()
          onReplayTour()
        }}
      >
        <Icon name="spark" size={16} /> Replay the tutorial
      </button>
    </Sheet>
  )
}
