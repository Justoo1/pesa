"use client"

import { useState } from "react"
import { Icon } from "../icons"
import { AddPastTxnSheet, type PastTxnBucket } from "./add-past-txn"

export function AddPastTxnButton({
  ym,
  buckets,
  currency,
}: {
  // Omit to let the user pick any past month from inside the sheet (used on
  // the /months index). Provide it to lock the sheet to a specific month
  // (used inside /months/[ym]).
  ym?: string
  buckets: PastTxnBucket[]
  currency: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-icon"
        aria-label="Add transaction to this month"
        onClick={() => setOpen(true)}
      >
        <Icon name="plus" size={18} />
      </button>
      <AddPastTxnSheet
        open={open}
        onClose={() => setOpen(false)}
        ym={ym}
        buckets={buckets}
        currency={currency}
      />
    </>
  )
}
