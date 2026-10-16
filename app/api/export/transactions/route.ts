import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isWebLocked } from "@/lib/app-lock"
import { buildMonthCsv, csvResponseInit } from "@/lib/export"

export async function GET() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return new NextResponse("Unauthorized", { status: 401 })
  if (await isWebLocked(userId))
    return new NextResponse("Locked", { status: 423 })

  const { filename, body } = await buildMonthCsv(userId)
  return new NextResponse(body, csvResponseInit(filename))
}
