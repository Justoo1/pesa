"use client"

import { useState } from "react"
import { Icon } from "../icons"
import { Sheet } from "../ui"
import type { Action, BucketColor, BucketKind, IconName } from "../types"

const ICON_CHOICES: IconName[] = [
  "home",
  "piggy",
  "heart",
  "leaf",
  "shield",
  "sun",
  "broom",
  "wifi",
  "flame",
  "bulb",
  "wallet",
  "tag",
]

const COLOR_CHOICES: { value: BucketColor; label: string; swatch: string }[] = [
  { value: "clay", label: "Clay", swatch: "var(--clay)" },
  { value: "green", label: "Green", swatch: "var(--green)" },
  { value: "gold", label: "Gold", swatch: "var(--gold)" },
  { value: "rose", label: "Rose", swatch: "var(--rose)" },
  { value: "sage", label: "Sage", swatch: "var(--green-soft)" },
]

const KIND_CHOICES: { value: BucketKind; label: string }[] = [
  { value: "essential", label: "Essential" },
  { value: "bills", label: "Bills" },
  { value: "future", label: "Future" },
  { value: "give", label: "Give" },
  { value: "people", label: "People" },
]

export function AddPotSheet({
  open,
  onClose,
  dispatch,
}: {
  open: boolean
  onClose: () => void
  dispatch: (a: Action) => void
}) {
  if (!open) return null
  return <AddPotContent onClose={onClose} dispatch={dispatch} />
}

function AddPotContent({
  onClose,
  dispatch,
}: {
  onClose: () => void
  dispatch: (a: Action) => void
}) {
  const [name, setName] = useState("")
  const [target, setTarget] = useState("")
  const [icon, setIcon] = useState<IconName>("piggy")
  const [color, setColor] = useState<BucketColor>("green")
  const [kind, setKind] = useState<BucketKind>("future")

  const targetNum = parseInt(target.replace(/[^0-9]/g, ""), 10) || 0
  const canSubmit = name.trim().length > 0 && targetNum > 0

  const submit = () => {
    if (!canSubmit) return
    dispatch({
      type: "addBucket",
      name: name.trim(),
      target: targetNum,
      color,
      icon,
      kind,
    })
    onClose()
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
        <button
          className="btn btn-ghost btn-icon"
          onClick={onClose}
          aria-label="Close"
        >
          <Icon name="close" size={18} />
        </button>
        <div className="serif" style={{ fontSize: 22 }}>
          New pot
        </div>
        <div style={{ width: 44 }}></div>
      </div>

      <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>
            Name
          </div>
          <input
            className="input"
            placeholder="e.g. Books, Trip, Car fund"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <div className="label" style={{ marginBottom: 6 }}>
            Monthly target
          </div>
          <input
            className="input num"
            inputMode="numeric"
            placeholder="0"
            value={target}
            onChange={(e) => setTarget(e.target.value.replace(/[^0-9]/g, ""))}
          />
        </div>

        <div>
          <div className="label" style={{ marginBottom: 8 }}>
            Icon
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 6,
            }}
          >
            {ICON_CHOICES.map((i) => {
              const active = icon === i
              return (
                <button
                  key={i}
                  onClick={() => setIcon(i)}
                  aria-label={i}
                  style={{
                    appearance: "none",
                    border: 0,
                    cursor: "pointer",
                    background: active ? "var(--ink)" : "var(--bg-card)",
                    color: active ? "var(--bg-app)" : "var(--ink-2)",
                    aspectRatio: "1 / 1",
                    borderRadius: 12,
                    display: "grid",
                    placeItems: "center",
                    boxShadow: active ? "none" : "inset 0 0 0 1px var(--line)",
                  }}
                >
                  <Icon name={i} size={18} />
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <div className="label" style={{ marginBottom: 8 }}>
            Color
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {COLOR_CHOICES.map((c) => {
              const active = color === c.value
              return (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className="chip"
                  style={{
                    background: active ? "var(--ink)" : "rgba(33,26,18,0.06)",
                    color: active ? "var(--bg-app)" : "var(--ink)",
                  }}
                >
                  <span
                    className="dot"
                    style={{ background: c.swatch, width: 12, height: 12 }}
                  ></span>
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <div className="label" style={{ marginBottom: 8 }}>
            Kind
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {KIND_CHOICES.map((k) => {
              const active = kind === k.value
              return (
                <button
                  key={k.value}
                  onClick={() => setKind(k.value)}
                  className="chip"
                  style={{
                    background: active ? "var(--ink)" : "rgba(33,26,18,0.06)",
                    color: active ? "var(--bg-app)" : "var(--ink)",
                  }}
                >
                  {k.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <button
        className="btn btn-green btn-block"
        style={{ marginTop: 20 }}
        disabled={!canSubmit}
        onClick={submit}
      >
        <Icon name="plus" size={16} /> Create pot
      </button>
    </Sheet>
  )
}
