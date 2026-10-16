import { NextResponse } from "next/server"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { buildMonthCsv, csvResponseInit } from "@/lib/export"
import { withMobileRoute } from "@/lib/mobile/response"

/** This month's transactions as a CSV file (More → Export this month). */
export const GET = withMobileRoute(async (request) => {
  const userId = await requireMobileUserId(request)
  const { filename, body } = await buildMonthCsv(userId)
  return new NextResponse(body, csvResponseInit(filename))
})
