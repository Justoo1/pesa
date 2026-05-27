"use client"

import { useEffect, useState } from "react"

function formatTime(d: Date): string {
  let h = d.getHours()
  const m = d.getMinutes()
  const ampm = h >= 12 ? "PM" : "AM"
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`
}

export function Clock() {
  const [time, setTime] = useState<string | null>(null)

  useEffect(() => {
    const tick = () => setTime(formatTime(new Date()))
    tick()
    const id = setInterval(tick, 15_000)
    return () => clearInterval(id)
  }, [])

  return <span suppressHydrationWarning>{time ?? ""}</span>
}
