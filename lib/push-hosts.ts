/**
 * Browser push services we deliver to. A subscription endpoint is a URL the
 * server POSTs to, so accepting any URL would let a caller make the server
 * call arbitrary (even internal) hosts. Only real push services are allowed.
 */
const ALLOWED_SUFFIXES = [
  "fcm.googleapis.com", // Chrome, Edge (Chromium), Android
  "push.services.mozilla.com", // Firefox
  "push.apple.com", // Safari (web.push.apple.com)
  "notify.windows.com", // legacy Edge / Windows (WNS)
]

export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }
  if (url.protocol !== "https:") return false
  const host = url.hostname.toLowerCase()
  return ALLOWED_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`))
}
