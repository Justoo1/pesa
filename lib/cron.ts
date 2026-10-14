import { timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"

/**
 * Authorizes a Vercel Cron request (`Authorization: Bearer $CRON_SECRET`).
 * Fails closed: with no secret configured every request is refused, so a
 * missing env var can never expose the cron routes (which move money).
 * Returns a 403/500 response to send back, or null when authorized.
 */
export function rejectUnauthorizedCron(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret || secret.length < 16) {
    console.error("[cron] CRON_SECRET is missing or shorter than 16 chars — refusing to run")
    return new NextResponse("Cron is not configured", { status: 500 })
  }
  const expected = Buffer.from(`Bearer ${secret}`)
  const given = Buffer.from(request.headers.get("authorization") ?? "")
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new NextResponse("Forbidden", { status: 403 })
  }
  return null
}
