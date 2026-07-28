"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "../icons"
import { fmtMoney, fmtTxnDate } from "../format"
import { Counter, MiniStat, Sheet } from "../ui"
import type { AppState, BankTransaction, BankTransactionKind } from "../types"
import { addFundsToBank, spendFromBank } from "@/app/actions/bank"

function iconForKind(kind: BankTransactionKind) {
  switch (kind) {
    case "income":
      return "wallet" as const
    case "manual":
      return "plus" as const
    case "spend":
      return "minus" as const
    case "disburse":
    default:
      return "send" as const
  }
}

function AddFundsSheet({
  open,
  onClose,
  currency,
}: {
  open: boolean
  onClose: () => void
  currency: string
}) {
  const router = useRouter()
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, startTransition] = useTransition()
  if (!open) return null

  const amountNum = parseInt(amount.replace(/[^0-9]/g, ""), 10) || 0
  const canSubmit = amountNum > 0

  const submit = () => {
    if (!canSubmit) return
    setError(null)
    startTransition(async () => {
      try {
        await addFundsToBank({ amount: amountNum, note: note.trim() || undefined })
        router.refresh()
        setAmount("")
        setNote("")
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not add funds")
      }
    })
  }

  return (
    <Sheet open={true} onClose={onClose} height="60%">
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
          Add funds
        </div>
        <div style={{ width: 44 }}></div>
      </div>

      <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>
            Amount
          </div>
          <input
            className="input num"
            inputMode="numeric"
            placeholder={`${currency}0`}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
            autoFocus
          />
        </div>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>
            Note (optional)
          </div>
          <input
            className="input"
            placeholder="e.g. Bonus, gift, refund"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
          />
        </div>
        {error && (
          <div className="tiny" style={{ color: "var(--clay-deep)" }}>
            {error}
          </div>
        )}
      </div>

      <button
        className="btn btn-green btn-block"
        style={{ marginTop: 20 }}
        disabled={!canSubmit || busy}
        onClick={submit}
      >
        <Icon name="plus" size={16} /> Add to bank
      </button>
    </Sheet>
  )
}

function SpendFromBankSheet({
  open,
  onClose,
  currency,
  spendableRemaining,
}: {
  open: boolean
  onClose: () => void
  currency: string
  spendableRemaining: number
}) {
  const router = useRouter()
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, startTransition] = useTransition()
  if (!open) return null

  const amountNum = parseInt(amount.replace(/[^0-9]/g, ""), 10) || 0
  const canSubmit = amountNum > 0
  const overspends = amountNum > 0 && amountNum > spendableRemaining

  const submit = () => {
    if (!canSubmit) return
    setError(null)
    startTransition(async () => {
      try {
        await spendFromBank({ amount: amountNum, note: note.trim() || undefined })
        router.refresh()
        setAmount("")
        setNote("")
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not log spend")
      }
    })
  }

  return (
    <Sheet open={true} onClose={onClose} height="60%">
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
          Log a personal spend
        </div>
        <div style={{ width: 44 }}></div>
      </div>

      <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="small">
          For money you take out and spend on yourself — not sent to any pot.
          This lowers your bank balance right away.
        </div>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>
            Amount
          </div>
          <input
            className="input num"
            inputMode="numeric"
            placeholder={`${currency}0`}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
            autoFocus
          />
          <div className="tiny" style={{ marginTop: 6, color: "var(--ink-3)" }}>
            {fmtMoney(Math.max(0, spendableRemaining), currency)} spendable left this month
          </div>
        </div>
        {overspends && (
          <div
            className="card"
            style={{
              padding: 12,
              background: "var(--clay-soft)",
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <Icon name="info" size={18} />
            <div className="body" style={{ color: "var(--clay-deep)" }}>
              This is{" "}
              <strong style={{ color: "var(--clay-deep)" }}>
                {fmtMoney(amountNum - Math.max(0, spendableRemaining), currency)}
              </strong>{" "}
              more than your spendable amount for the month — the rest will come
              straight out of your bank balance.
            </div>
          </div>
        )}
        <div>
          <div className="label" style={{ marginBottom: 6 }}>
            Note (optional)
          </div>
          <input
            className="input"
            placeholder="e.g. Lunch, taxi, groceries"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
          />
        </div>
        {error && (
          <div className="tiny" style={{ color: "var(--clay-deep)" }}>
            {error}
          </div>
        )}
      </div>

      <button
        className="btn btn-clay btn-block"
        style={{ marginTop: 20 }}
        disabled={!canSubmit || busy}
        onClick={submit}
      >
        <Icon name="minus" size={16} /> Log spend
      </button>
    </Sheet>
  )
}

export function BankScreen({
  state,
  bankLedger,
  currency,
  monthlyBankSpend,
}: {
  state: AppState
  bankLedger: BankTransaction[]
  currency: string
  monthlyBankSpend: number
}) {
  const { bankBalance, buckets, salary } = state
  const totalAllocated = buckets.reduce((s, b) => s + b.allocated, 0)
  const totalTarget = buckets.reduce((s, b) => s + b.target, 0)
  // The bank balance is the ledger, full stop: monthly income credits minus
  // pot disbursements, plus manual add/spend. Salary not yet earmarked to a
  // pot's target ("Spendable") is a separate informational figure below —
  // it is NOT added into the headline balance, since that money is only
  // real once a payday credit has actually landed in the ledger.
  const balance = bankBalance
  const unallocatedSalary = salary - totalTarget
  // Personal spends logged this month eat into that unallocated allowance —
  // once it's gone, further spends are still allowed (see the sheet's
  // warning) but come straight out of the bank balance instead.
  const spendableRemaining = unallocatedSalary - monthlyBankSpend
  const [addOpen, setAddOpen] = useState(false)
  const [spendOpen, setSpendOpen] = useState(false)
  const overdrawn = balance < 0

  return (
    <>
      <div style={{ padding: "8px 20px 4px" }}>
        <div
          className="tiny"
          style={{ fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          Bank
        </div>
        <div className="serif" style={{ fontSize: 30, lineHeight: 1.05, color: "var(--ink)" }}>
          Your <span className="italic">balance.</span>
        </div>
      </div>

      <div style={{ padding: "16px 20px 4px" }}>
        <div
          className="card"
          style={{
            background: "linear-gradient(155deg, #23283A 0%, #333C57 60%, #454F72 100%)",
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
            <circle cx="90" cy="90" r="80" fill="none" stroke="#C9CEE0" strokeWidth="1.2" />
            <circle cx="90" cy="90" r="56" fill="none" stroke="#C9CEE0" strokeWidth="1.2" />
            <circle cx="90" cy="90" r="32" fill="#C9CEE0" opacity="0.6" />
          </svg>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{ width: 8, height: 8, borderRadius: 999, background: "#C9CEE0" }}
              ></span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#DCE0F0",
                }}
              >
                {overdrawn ? "Overdrawn" : "Available"}
              </span>
            </div>
            <Icon name="wallet" size={20} />
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 12 }}>
            <span className="serif" style={{ fontSize: 18, color: "#DCE0F0" }}>
              {overdrawn ? "−" : ""}
              {currency}
            </span>
            <span
              className="serif"
              style={{
                fontSize: 64,
                lineHeight: 1,
                color: overdrawn ? "#F3C9C0" : "#F4EBD9",
                fontWeight: 400,
              }}
            >
              <Counter value={Math.abs(balance)} />
            </span>
          </div>

          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: "#DCE0F0",
            }}
          >
            {fmtMoney(totalAllocated, currency)} sent to pots this month
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 16,
            }}
          >
            <button className="btn btn-clay btn-block" onClick={() => setAddOpen(true)}>
              <Icon name="plus" size={16} /> Add funds
            </button>
            <button
              className="btn btn-soft btn-block"
              style={{
                background: "rgba(244,235,217,0.1)",
                color: "#F4EBD9",
                boxShadow: "inset 0 0 0 1px rgba(244,235,217,0.2)",
              }}
              onClick={() => setSpendOpen(true)}
            >
              <Icon name="minus" size={16} /> Log a spend
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "14px 20px 0",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        <MiniStat
          label="Spendable this month"
          value={fmtMoney(Math.max(0, spendableRemaining), currency)}
          tint={spendableRemaining < 0 ? "clay" : "gold"}
        />
        <MiniStat
          label="Spent this month"
          value={fmtMoney(monthlyBankSpend, currency)}
          tint="clay"
        />
      </div>

      <div
        style={{
          padding: "22px 20px 8px",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <div className="serif" style={{ fontSize: 22, color: "var(--ink)" }}>
          Statement
        </div>
        <div className="tiny">
          {bankLedger.length} entr{bankLedger.length === 1 ? "y" : "ies"}
        </div>
      </div>

      <div style={{ padding: "0 20px 28px" }}>
        <div className="card" style={{ padding: "4px 4px" }}>
          {bankLedger.length === 0 && (
            <div style={{ padding: 18, textAlign: "center" }}>
              <div className="body">
                Add funds or wait for your next payday credit to see activity here.
              </div>
            </div>
          )}
          {bankLedger.map((t) => {
            const outflow = t.amount < 0
            return (
              <div key={t.id} className="row" style={{ borderTop: "1px solid transparent" }}>
                <div className="row-icon">
                  <Icon name={iconForKind(t.kind)} size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>
                    {t.note}
                  </div>
                  <div className="tiny">{fmtTxnDate(t.occurredAt)}</div>
                </div>
                <div
                  className="num"
                  style={{
                    fontWeight: 600,
                    color: outflow ? "var(--clay-deep)" : "var(--green-deep)",
                  }}
                >
                  {outflow ? "−" : "+"}
                  {fmtMoney(Math.abs(t.amount), currency)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <AddFundsSheet open={addOpen} onClose={() => setAddOpen(false)} currency={currency} />
      <SpendFromBankSheet
        open={spendOpen}
        onClose={() => setSpendOpen(false)}
        currency={currency}
        spendableRemaining={spendableRemaining}
      />
    </>
  )
}
