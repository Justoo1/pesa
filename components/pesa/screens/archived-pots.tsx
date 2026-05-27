"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "../icons"
import { fmtMoney } from "../format"
import { Sheet } from "../ui"
import type { BucketColor, IconName } from "../types"
import {
  listArchivedBuckets,
  restoreBucket,
  deleteBucket,
} from "@/app/actions/buckets"

type ArchivedBucket = {
  id: string
  name: string
  color: string
  icon: string
  kind: string
  target: number
  allocated: number
  archivedAt: Date | null
  _count: { txns: number }
}

export function ArchivedPotsSheet({
  open,
  onClose,
  currency,
}: {
  open: boolean
  onClose: () => void
  currency: string
}) {
  const router = useRouter()
  const [buckets, setBuckets] = useState<ArchivedBucket[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startMutation] = useTransition()

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    listArchivedBuckets()
      .then((rows) => setBuckets(rows as ArchivedBucket[]))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Could not load archived pots"),
      )
      .finally(() => setLoading(false))
  }, [open])

  const refresh = async () => {
    const rows = await listArchivedBuckets()
    setBuckets(rows as ArchivedBucket[])
    router.refresh()
  }

  const handleRestore = (id: string) => {
    setBusyId(id)
    setError(null)
    startMutation(async () => {
      try {
        await restoreBucket({ bucketId: id })
        await refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not restore")
      } finally {
        setBusyId(null)
      }
    })
  }

  const handleDelete = (b: ArchivedBucket) => {
    const txnNote =
      b._count.txns > 0
        ? ` This will also delete ${b._count.txns} transaction${b._count.txns === 1 ? "" : "s"} tied to it — they will disappear from past months too.`
        : ""
    if (
      !window.confirm(
        `Permanently delete '${b.name}'?${txnNote} This cannot be undone.`,
      )
    )
      return
    setBusyId(b.id)
    setError(null)
    startMutation(async () => {
      try {
        await deleteBucket({ bucketId: b.id })
        await refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not delete")
      } finally {
        setBusyId(null)
      }
    })
  }

  return (
    <Sheet open={open} onClose={onClose} height="82%">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 4px 8px",
        }}
      >
        <button
          className="btn btn-ghost btn-icon"
          onClick={onClose}
          aria-label="Close"
        >
          <Icon name="close" size={18} />
        </button>
        <span style={{ fontWeight: 600 }}>Archived pots</span>
        <span style={{ width: 44 }} />
      </div>

      <div style={{ overflowY: "auto", flex: 1, padding: "4px 4px 12px" }}>
        <div
          className="serif"
          style={{ fontSize: 22, lineHeight: 1.1, padding: "0 4px 6px" }}
        >
          Pots you&apos;ve <span className="italic">tucked away.</span>
        </div>
        <div className="small" style={{ padding: "0 4px 14px" }}>
          Restore one to use it again, or remove it for good.
        </div>

        {error && (
          <div
            className="tiny"
            style={{ color: "var(--clay-deep)", padding: "0 4px 10px" }}
          >
            {error}
          </div>
        )}

        {loading && !buckets ? (
          <div className="card" style={{ padding: 22, textAlign: "center" }}>
            <div className="body">Loading…</div>
          </div>
        ) : buckets && buckets.length === 0 ? (
          <div className="card" style={{ padding: 22, textAlign: "center" }}>
            <div className="serif" style={{ fontSize: 20, marginBottom: 4 }}>
              Nothing archived
            </div>
            <div className="body">
              Pots you archive from the edit sheet will show up here.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {buckets?.map((b) => {
              const isBusy = busyId === b.id
              return (
                <div key={b.id} className="card" style={{ padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className={`row-icon ${b.color as BucketColor}`}>
                      <Icon name={b.icon as IconName} size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="serif" style={{ fontSize: 17, lineHeight: 1 }}>
                        {b.name}
                      </div>
                      <div className="tiny" style={{ marginTop: 2 }}>
                        {b.archivedAt
                          ? `Archived ${new Date(b.archivedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                          : "Archived"}
                        {" · "}
                        {b._count.txns} txn{b._count.txns === 1 ? "" : "s"}
                        {" · last target "}
                        {fmtMoney(b.target, currency)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <button
                      type="button"
                      className="btn btn-soft"
                      style={{ flex: 1 }}
                      disabled={isBusy}
                      onClick={() => handleRestore(b.id)}
                    >
                      <Icon name="check" size={14} /> Restore
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{
                        flex: 1,
                        color: "var(--clay-deep)",
                      }}
                      disabled={isBusy}
                      onClick={() => handleDelete(b)}
                    >
                      <Icon name="close" size={14} /> Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Sheet>
  )
}
