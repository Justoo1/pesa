import { NextResponse } from "next/server"
import { devCodesEnabled, latestDevCode } from "@/lib/mobile/dev-codes"

/**
 * DEV ONLY — returns the latest email sign-in code for `?email=` so the
 * Android integration test can complete the passwordless flow. 404s in
 * production (the codes are never stored there either).
 */
export async function GET(request: Request) {
  if (!devCodesEnabled()) return new NextResponse("Not found", { status: 404 })
  const email = new URL(request.url).searchParams.get("email")?.toLowerCase()
  const code = email ? latestDevCode(email) : null
  if (!code) return NextResponse.json({ ok: false }, { status: 404 })
  return NextResponse.json({ ok: true, data: { code } })
}
