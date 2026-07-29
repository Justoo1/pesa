"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "../icons"
import { fmtMoney } from "../format"
import { Sheet, Toggle } from "../ui"
import type { IncomeSource } from "../types"
import {
  createIncomeSource,
  deleteIncomeSource,
  toggleIncomeSource,
  updateIncomeSource,
} from "@/app/actions/income-sources"

function IncomeSourceRow({
  source,
  currency,
  onChanged,
}: {
  source: IncomeSource
  currency: string
  onChanged: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(source.name)
  const [amount, setAmount] = useState(String(source.amount))
  const [busy, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    const amountNum = parseInt(amount.replace(/[^0-9]/g, ""), 10) || 0
    if (!name.trim() || amountNum <= 0) return
    setError(null)
    startTransition(async () => {
      try {
        await updateIncomeSource({
          incomeSourceId: source.id,
          name: name.trim(),
          amount: amountNum,
        })
        await onChanged()
        setEditing(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save")
      }
    })
  }

  const toggleActive = () => {
    startTransition(async () => {
      try {
        await toggleIncomeSource({ incomeSourceId: source.id, active: !source.active })
        await onChanged()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not update")
      }
    })
  }

  const remove = () => {
    if (!window.confirm(`Delete '${source.name}'?`)) return
    startTransition(async () => {
      try {
        await deleteIncomeSource({ incomeSourceId: source.id })
        await onChanged()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not delete")
      }
    })
  }

  if (editing) {
    return (
      <div className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Source name"
          autoFocus
        />
        <input
          className="input num"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="0"
        />
        {error && (
          <div className="tiny" style={{ color: "var(--clay-deep)" }}>
            {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ flex: 1 }}
            disabled={busy}
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-green"
            style={{ flex: 1 }}
            disabled={busy}
            onClick={save}
          >
            <Icon name="check" size={14} /> Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          onClick={() => setEditing(true)}
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: "left",
            appearance: "none",
            border: 0,
            background: "transparent",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <div className="serif" style={{ fontSize: 17, lineHeight: 1, opacity: source.active ? 1 : 0.5 }}>
            {source.name}
          </div>
          <div className="num" style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>
            {fmtMoney(source.amount, currency)}
            {!source.active && " · inactive"}
          </div>
        </button>
        <Toggle on={source.active} onClick={toggleActive} />
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          style={{ width: 32, height: 32, color: "var(--clay-deep)" }}
          disabled={busy}
          onClick={remove}
          aria-label={`Delete ${source.name}`}
        >
          <Icon name="close" size={14} />
        </button>
      </div>
      {error && (
        <div className="tiny" style={{ color: "var(--clay-deep)", marginTop: 8 }}>
          {error}
        </div>
      )}
    </div>
  )
}

function AddIncomeSourceForm({ onChanged }: { onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, startTransition] = useTransition()

  const amountNum = parseInt(amount.replace(/[^0-9]/g, ""), 10) || 0
  const canSubmit = name.trim().length > 0 && amountNum > 0

  const submit = () => {
    if (!canSubmit) return
    setError(null)
    startTransition(async () => {
      try {
        await createIncomeSource({ name: name.trim(), amount: amountNum })
        await onChanged()
        setName("")
        setAmount("")
        setOpen(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not add source")
      }
    })
  }

  if (!open) {
    return (
      <button className="btn btn-soft btn-block" onClick={() => setOpen(true)}>
        <Icon name="plus" size={16} /> Add income source
      </button>
    )
  }

  return (
    <div className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        className="input"
        placeholder="e.g. Job, Freelance, Side hustle"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <input
        className="input num"
        inputMode="numeric"
        placeholder="Monthly amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
      />
      {error && (
        <div className="tiny" style={{ color: "var(--clay-deep)" }}>
          {error}
        </div>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-green"
          style={{ flex: 1 }}
          disabled={!canSubmit || busy}
          onClick={submit}
        >
          <Icon name="plus" size={14} /> Add
        </button>
      </div>
    </div>
  )
}

export function IncomeSourcesSheet({
  open,
  onClose,
  incomeSources,
  currency,
}: {
  open: boolean
  onClose: () => void
  incomeSources: IncomeSource[]
  currency: string
}) {
  const router = useRouter()
  if (!open) return null

  const total = incomeSources.filter((s) => s.active).reduce((s, a) => s + a.amount, 0)
  const onChanged = async () => {
    router.refresh()
  }

  return (
    <Sheet open={true} onClose={onClose} height="86%">
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
          Income sources
        </div>
        <div style={{ width: 44 }}></div>
      </div>

      <div style={{ padding: "0 4px 12px" }}>
        <div className="small">
          Total salary is the sum of every active source below —{" "}
          <span className="num" style={{ fontWeight: 600 }}>{fmtMoney(total, currency)}</span>.
        </div>
      </div>

      <div style={{ overflowY: "auto", flex: 1, padding: "0 4px", display: "flex", flexDirection: "column", gap: 8 }}>
        {incomeSources.length === 0 ? (
          <div className="card" style={{ padding: 22, textAlign: "center" }}>
            <div className="serif" style={{ fontSize: 20, marginBottom: 4 }}>
              No income sources yet
            </div>
            <div className="body">Add your job, side hustle, or any other regular income.</div>
          </div>
        ) : (
          incomeSources.map((s) => (
            <IncomeSourceRow key={s.id} source={s} currency={currency} onChanged={onChanged} />
          ))
        )}
        <AddIncomeSourceForm onChanged={onChanged} />
      </div>
    </Sheet>
  )
}
