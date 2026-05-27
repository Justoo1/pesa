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
