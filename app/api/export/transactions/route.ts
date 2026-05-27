import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

function csvEscape(value: string | number): string {
  const s = String(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return new NextResponse("Unauthorized", { status: 401 })

  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const txns = await prisma.transaction.findMany({
    where: { userId, occurredAt: { gte: start, lt: end } },
    orderBy: { occurredAt: "asc" },
    include: { bucket: { select: { name: true } } },
  })

  const header = ["date", "bucket", "amount", "note", "method"].join(",")
  const rows = txns.map((t) =>
    [
      t.occurredAt.toISOString().slice(0, 10),
      csvEscape(t.bucket.name),
      t.amount,
      csvEscape(t.note),
      csvEscape(t.method),
    ].join(","),
  )

  const ym = now.toISOString().slice(0, 7)
  const body = [header, ...rows].join("\n") + "\n"
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pesa-${ym}.csv"`,
    },
  })
}
