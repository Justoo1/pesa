"use client"

import { useState } from "react"

const STORAGE_KEY = "pesa.unlocked"

export function LockButton({ appLockEnabled }: { appLockEnabled: boolean }) {
  const [toast, setToast] = useState<string | null>(null)

  const onClick = () => {
    if (appLockEnabled) {
      sessionStorage.removeItem(STORAGE_KEY)
      window.location.reload()
      return
    }
    setToast("Set a PIN first in Settings · App lock.")
    setTimeout(() => setToast(null), 2400)
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label={appLockEnabled ? "Lock Pesa" : "App lock not set"}
        title={appLockEnabled ? "Lock Pesa" : "App lock not set"}
        style={{
          background: "transparent",
          border: 0,
          padding: 0,
          color: "inherit",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path
            d="M8 11C4 11 1.5 8 0.5 6.5 2 4 4 2 8 2s6 2 7.5 4.5C14.5 8 12 11 8 11Zm0-2.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
            fill="currentColor"
          />
        </svg>
      </button>
      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
