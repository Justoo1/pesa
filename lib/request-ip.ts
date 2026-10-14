import { headers } from "next/headers"

/** First hop of `x-forwarded-for` (set by Vercel), else `x-real-ip`. */
function ipFrom(get: (name: string) => string | null): string {
  const forwarded = get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || get("x-real-ip")?.trim() || "unknown"
}

/** Client IP for a route handler's `Request`. */
export function requestIp(request: Request): string {
  return ipFrom((n) => request.headers.get(n))
}

/** Client IP inside a server action / server component. */
export async function actionIp(): Promise<string> {
  const h = await headers()
  return ipFrom((n) => h.get(n))
}
