"use client"

import { useEffect, useState } from "react"

const STORAGE_KEY = "pesa.unlocked"
const LOCK_EVENT = "pesa:lock-state"

export function LockButton({ appLockEnabled }: { appLockEnabled: boolean }) {
  const [toast, setToast] = useState<string | null>(null)
  const [locked, setLocked] = useState<boolean>(appLockEnabled)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const read = () => {
      if (!appLockEnabled) {
        setLocked(false)
        return
      }
      setLocked(sessionStorage.getItem(STORAGE_KEY) !== "1")
    }
    read()
    window.addEventListener(LOCK_EVENT, read)
    return () => window.removeEventListener(LOCK_EVENT, read)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [appLockEnabled])

  if (locked) return null

  const onClick = () => {
    if (appLockEnabled) {
      sessionStorage.removeItem(STORAGE_KEY)
      window.dispatchEvent(new Event(LOCK_EVENT))
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
