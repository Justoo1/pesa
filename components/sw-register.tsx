"use client"

import { useEffect } from "react"

export function SwRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failures are non-fatal — the app still works without the SW.
    })
  }, [])

  return null
}
