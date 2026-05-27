"use client"

import { Icon } from "../icons"
import type { BucketColor, BucketKind, IconName } from "../types"

export const ICON_CHOICES: IconName[] = [
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

export const COLOR_CHOICES: {
  value: BucketColor
  label: string
  swatch: string
}[] = [
  { value: "clay", label: "Clay", swatch: "var(--clay)" },
  { value: "green", label: "Green", swatch: "var(--green)" },
  { value: "gold", label: "Gold", swatch: "var(--gold)" },
  { value: "rose", label: "Rose", swatch: "var(--rose)" },
  { value: "sage", label: "Sage", swatch: "var(--green-soft)" },
]

export const KIND_CHOICES: { value: BucketKind; label: string }[] = [
  { value: "essential", label: "Essential" },
  { value: "bills", label: "Bills" },
  { value: "future", label: "Future" },
  { value: "give", label: "Give" },
  { value: "people", label: "People" },
]

export function IconPicker({
  value,
  onChange,
}: {
  value: IconName
  onChange: (v: IconName) => void
}) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 8 }}>
        Icon
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
        {ICON_CHOICES.map((i) => {
          const active = value === i
          return (
            <button
              key={i}
              onClick={() => onChange(i)}
              aria-label={i}
              type="button"
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
  )
}

export function ColorPicker({
  value,
  onChange,
}: {
  value: BucketColor
  onChange: (v: BucketColor) => void
}) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 8 }}>
        Color
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {COLOR_CHOICES.map((c) => {
          const active = value === c.value
          return (
            <button
              key={c.value}
              onClick={() => onChange(c.value)}
              type="button"
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
  )
}

export function KindPicker({
  value,
  onChange,
}: {
  value: BucketKind
  onChange: (v: BucketKind) => void
}) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 8 }}>
        Kind
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {KIND_CHOICES.map((k) => {
          const active = value === k.value
          return (
            <button
              key={k.value}
              onClick={() => onChange(k.value)}
              type="button"
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
  )
}
