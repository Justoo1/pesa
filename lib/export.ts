import { prisma } from "@/lib/db"

function csvEscape(value: string | number): string {
  let s = String(value)
  // Neutralize spreadsheet formulas in user text (a pot named "=HYPERLINK(…)"
  // would otherwise execute when the CSV is opened in Excel/Sheets).
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** This calendar month's pot transactions as CSV (web + mobile export). */
export async function buildMonthCsv(userId: string, now = new Date()) {
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
    ].join(",")
  )

  const ym = now.toISOString().slice(0, 7)
  return {
    filename: `pesa-${ym}.csv`,
    body: [header, ...rows].join("\n") + "\n",
  }
}

export function csvResponseInit(filename: string): ResponseInit {
  return {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  }
}
