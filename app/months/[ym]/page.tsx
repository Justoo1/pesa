import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { fmtMoney, fmtTxnDate } from "@/components/pesa/format"
import { Icon } from "@/components/pesa/icons"
import type { BucketColor, IconName } from "@/components/pesa/types"
import { AddPastTxnButton } from "@/components/pesa/screens/add-past-txn-button"

export const dynamic = "force-dynamic"

const SAVED_KINDS = new Set(["future"])
const GAVE_KINDS = new Set(["give", "people"])
const LIVED_KINDS = new Set(["essential", "bills"])

export default async function MonthDetailPage({
  params,
}: {
  params: Promise<{ ym: string }>
}) {
  const { ym } = await params
  if (!/^\d{4}-\d{2}$/.test(ym)) notFound()

  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")
  const userId = session.user.id

  const [year, month] = ym.split("-").map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)
  const label = start.toLocaleString("en-US", { month: "long", year: "numeric" })

  const [user, txns, activeBuckets] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { currency: true },
    }),
    prisma.transaction.findMany({
      where: { userId, occurredAt: { gte: start, lt: end } },
      orderBy: { occurredAt: "desc" },
      include: {
        bucket: { select: { name: true, icon: true, color: true, kind: true } },
      },
    }),
    prisma.bucket.findMany({
      where: { userId, archivedAt: null },
      orderBy: { priority: "asc" },
      select: { id: true, name: true, color: true, icon: true },
    }),
  ])
  const currency = user.currency

  const now = new Date()
  const isPastMonth =
    year < now.getFullYear() ||
    (year === now.getFullYear() && month - 1 < now.getMonth())

  let saved = 0
  let gave = 0
  let lived = 0
  for (const t of txns) {
    if (SAVED_KINDS.has(t.bucket.kind)) saved += t.amount
    else if (GAVE_KINDS.has(t.bucket.kind)) gave += t.amount
    else if (LIVED_KINDS.has(t.bucket.kind)) lived += t.amount
  }
  const total = saved + gave + lived

  return (
    <div className="stage">
      <div className="scene">
        <div className="scene-copy">
          <div className="scene-tag">
            <span className="dot"></span> Pesa · history
          </div>
          <h1>
            {label.split(" ")[0]},
            <br />
            <span className="italic">in detail.</span>
          </h1>
          <p>Every transfer this month, sorted newest first, plus the totals by category.</p>
        </div>

        <div className="device">
          <div className="device-screen">
            <div className="statusbar" style={{ justifyContent: "space-between" }}>
              <Link href="/months" className="btn btn-ghost btn-icon" aria-label="Back">
                <Icon name="back" size={18} />
              </Link>
              <span style={{ fontWeight: 600 }}>{label}</span>
              {isPastMonth ? (
                <AddPastTxnButton
                  ym={ym}
                  buckets={activeBuckets as Parameters<typeof AddPastTxnButton>[0]["buckets"]}
                  currency={currency}
                />
              ) : (
                <span style={{ width: 44 }} />
              )}
            </div>

            <div className="scroll" style={{ flex: 1, padding: "8px 20px 28px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <Tile label="Saved" value={fmtMoney(saved, currency)} tint="green" />
                <Tile label="Gave" value={fmtMoney(gave, currency)} tint="gold" />
                <Tile label="Lived" value={fmtMoney(lived, currency)} tint="clay" />
              </div>

              <div
                className="card"
                style={{ padding: 14, marginBottom: 12 }}
              >
                <div
                  className="tiny"
                  style={{
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Total disbursed
                </div>
                <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>
                  {fmtMoney(total, currency)}
                </div>
              </div>

              <div className="card" style={{ padding: "4px 4px" }}>
                {txns.length === 0 ? (
                  <div style={{ padding: 18, textAlign: "center" }}>
                    <div className="body">No transfers this month.</div>
                  </div>
                ) : (
                  txns.map((t) => (
                    <div key={t.id} className="row">
                      <div className={`row-icon ${t.bucket.color as BucketColor}`}>
                        <Icon name={t.bucket.icon as IconName} size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{t.note}</div>
                        <div className="tiny">
                          {fmtTxnDate(t.occurredAt)} · {t.bucket.name} · {t.method}
                        </div>
                      </div>
                      <div className="num" style={{ fontWeight: 600 }}>
                        +{fmtMoney(t.amount, currency)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Tile({
  label,
  value,
  tint,
}: {
  label: string
  value: string
  tint: "green" | "clay" | "gold"
}) {
  const colors = {
    green: { bg: "var(--green-tint)", fg: "var(--green-deep)" },
    clay: { bg: "var(--clay-soft)", fg: "var(--clay-deep)" },
    gold: { bg: "#F1E1B8", fg: "#6E4F12" },
  }[tint]
  return (
    <div style={{ background: colors.bg, color: colors.fg, padding: 12, borderRadius: 16 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          opacity: 0.8,
        }}
      >
        {label}
      </div>
      <div className="num" style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>
        {value}
      </div>
    </div>
  )
}
