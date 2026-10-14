import { SignJWT, importPKCS8 } from "jose"

/**
 * Firebase Cloud Messaging (HTTP v1) for the mobile app. Dormant until
 * `FCM_SERVICE_ACCOUNT` holds the Firebase service-account JSON (raw or
 * base64) — see pesa_mobile/README.md "Push notifications".
 */

type ServiceAccount = { project_id: string; client_email: string; private_key: string }

let account: ServiceAccount | null | undefined
let cachedToken: { value: string; expiresAt: number } | null = null

function serviceAccount(): ServiceAccount | null {
  if (account !== undefined) return account
  const raw = process.env.FCM_SERVICE_ACCOUNT?.trim()
  if (!raw) return (account = null)
  try {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8")
    const parsed = JSON.parse(json) as ServiceAccount
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) throw new Error("incomplete")
    return (account = parsed)
  } catch (e) {
    console.error("[fcm] FCM_SERVICE_ACCOUNT is not valid service-account JSON", e)
    return (account = null)
  }
}

export function isFcmConfigured(): boolean {
  return serviceAccount() !== null
}

/** OAuth2 access token for the FCM scope (service-account JWT grant), cached. */
async function accessToken(sa: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value
  const key = await importPKCS8(sa.private_key, "RS256")
  const now = Math.floor(Date.now() / 1000)
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/firebase.messaging" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key)
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  })
  if (!res.ok) throw new Error(`FCM auth failed: ${res.status} ${await res.text()}`)
  const json = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 }
  return json.access_token
}

export type FcmMessage = { title: string; body: string; url?: string; tag?: string }

/**
 * Sends one notification to each device token. Returns how many were
 * delivered and which tokens FCM reported as gone (to be deleted).
 */
export async function sendFcm(
  tokens: string[],
  message: FcmMessage,
): Promise<{ sent: number; deadTokens: string[] }> {
  const sa = serviceAccount()
  if (!sa || tokens.length === 0) return { sent: 0, deadTokens: [] }
  const bearer = await accessToken(sa)
  const deadTokens: string[] = []
  let sent = 0

  await Promise.all(
    tokens.map(async (token) => {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
        {
          method: "POST",
          headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json" },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: message.title, body: message.body },
              data: { url: message.url ?? "/", tag: message.tag ?? "" },
              android: { notification: { tag: message.tag } },
              apns: { headers: message.tag ? { "apns-collapse-id": message.tag } : {} },
            },
          }),
        },
      )
      if (res.ok) {
        sent++
        return
      }
      const text = await res.text()
      // NOT_FOUND / UNREGISTERED = the app was uninstalled or the token rotated.
      if (res.status === 404 || /UNREGISTERED|registration-token-not-registered/i.test(text)) {
        deadTokens.push(token)
      } else {
        console.error("[fcm] send failed", res.status, text)
      }
    }),
  )
  return { sent, deadTokens }
}
