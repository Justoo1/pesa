"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "../icons"
import { Sheet } from "../ui"
import { ColorPicker, IconPicker, KindPicker } from "./bucket-form"
import { archiveBucket, updateBucket } from "@/app/actions/buckets"
import type { Bucket, BucketColor, BucketKind, IconName } from "../types"

export function EditPotSheet({
  open,
  onClose,
  bucket,
  focusField,
}: {
  open: boolean
  onClose: () => void
  bucket: Bucket | null
  focusField?: "target"
}) {
  if (!open || !bucket) return null
  return (
    <EditPotContent
      onClose={onClose}
      bucket={bucket}
      focusField={focusField}
    />
  )
}

function EditPotContent({
  onClose,
  bucket,
  focusField,
}: {
  onClose: () => void
  bucket: Bucket
  focusField?: "target"
}) {
  const router = useRouter()
  const [name, setName] = useState(bucket.name)
  const [target, setTarget] = useState(String(bucket.target))
  const [icon, setIcon] = useState<IconName>(bucket.icon)
  const [color, setColor] = useState<BucketColor>(bucket.color)
  const [kind, setKind] = useState<BucketKind>(bucket.kind)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const targetNum = parseInt(target.replace(/[^0-9]/g, ""), 10) || 0
  const canSubmit = name.trim().length > 0 && targetNum >= 0

  const submit = () => {
    if (!canSubmit) return
    setError(null)
    startTransition(async () => {
      try {
        await updateBucket({
          bucketId: bucket.id,
          name: name.trim(),
          target: targetNum,
          color,
          icon,
          kind,
        })
        router.refresh()
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save pot.")
      }
    })
  }

  const archive = () => {
    if (
      !window.confirm(
        `Archive "${bucket.name}"? It will disappear from your pots, but past transactions stay on record.`,
      )
    )
      return
    setError(null)
    startTransition(async () => {
      try {
        await archiveBucket({ bucketId: bucket.id })
        router.refresh()
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not archive.")
      }
    })
  }

  return (
    <Sheet open={true} onClose={onClose} height="92%">
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
          Edit pot
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus={focusField !== "target"}
          />
        </div>

        <div>
          <div className="label" style={{ marginBottom: 6 }}>
            Monthly target
          </div>
          <input
            className="input num"
            inputMode="numeric"
            value={target}
            onChange={(e) => setTarget(e.target.value.replace(/[^0-9]/g, ""))}
            autoFocus={focusField === "target"}
          />
        </div>

        <IconPicker value={icon} onChange={setIcon} />
        <ColorPicker value={color} onChange={setColor} />
        <KindPicker value={kind} onChange={setKind} />

        {error && (
          <div
            className="card"
            style={{
              padding: 12,
              background: "var(--clay-soft)",
              color: "var(--clay-deep)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 20,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <button
          className="btn btn-green btn-block"
          disabled={!canSubmit || isPending}
          onClick={submit}
        >
          <Icon name="check" size={16} /> Save changes
        </button>
        <button
          className="btn btn-soft btn-block"
          onClick={archive}
          disabled={isPending}
          style={{ color: "var(--clay-deep)" }}
        >
          Archive this pot
        </button>
      </div>
    </Sheet>
  )
}
