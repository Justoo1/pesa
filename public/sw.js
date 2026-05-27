self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

// Pass-through fetch handler. Chrome requires a fetch listener for the
// site to be considered installable, but we deliberately don't cache —
// every request goes to the network so financial data is never stale.
self.addEventListener("fetch", () => {})

self.addEventListener("push", (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: "Pesa", body: event.data ? event.data.text() : "" }
  }

  const title = payload.title || "Pesa"
  const options = {
    body: payload.body || "",
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: payload.tag,
    data: { url: payload.url || "/" },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || "/"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        const url = new URL(client.url)
        if (url.origin === self.location.origin) {
          client.focus()
          if ("navigate" in client) client.navigate(target)
          return
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})
