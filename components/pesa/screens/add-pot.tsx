"use client"

import { useState } from "react"
import { Icon } from "../icons"
import { Sheet } from "../ui"
import type { Action, BucketColor, BucketKind, IconName } from "../types"
import { ColorPicker, IconPicker, KindPicker } from "./bucket-form"

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

        <IconPicker value={icon} onChange={setIcon} />
        <ColorPicker value={color} onChange={setColor} />
        <KindPicker value={kind} onChange={setKind} />
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
