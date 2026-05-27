"use client"

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  const buf = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i)
  return buf
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

export async function getSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

export async function subscribe(): Promise<PushSubscription> {
  if (!isPushSupported()) throw new Error("Push not supported on this device")

  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapid) throw new Error("Push is not configured")

  const permission = await Notification.requestPermission()
  if (permission !== "granted") throw new Error("Permission denied")

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    })
  }

  const json = sub.toJSON()
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: json.keys,
      userAgent: navigator.userAgent,
    }),
  })
  if (!res.ok) throw new Error("Could not save subscription")

  return sub
}

export async function unsubscribe(): Promise<void> {
  const sub = await getSubscription()
  if (!sub) return

  await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, {
    method: "DELETE",
  })
  await sub.unsubscribe()
}
