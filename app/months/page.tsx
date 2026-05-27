import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { loadAllMonths } from "@/lib/insights"
import { fmtMoney } from "@/components/pesa/format"
import { Icon } from "@/components/pesa/icons"
import { AddPastTxnButton } from "@/components/pesa/screens/add-past-txn-button"

export const dynamic = "force-dynamic"

export default async function MonthsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")
  const userId = session.user.id

  const [user, months, activeBuckets] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { currency: true },
    }),
    loadAllMonths(userId),
    prisma.bucket.findMany({
      where: { userId, archivedAt: null },
      orderBy: { priority: "asc" },
      select: { id: true, name: true, color: true, icon: true },
    }),
  ])
  const currency = user.currency

  return (
    <div className="stage">
      <div className="scene">
        <div className="scene-copy">
          <div className="scene-tag">
            <span className="dot"></span> Pesa · history
          </div>
          <h1>
            Where it went,
            <br />
            <span className="italic">month by month.</span>
          </h1>
          <p>Each month is one tap deep — the full ledger, totals by category, and the pots you filled.</p>
        </div>

        <div className="device">
          <div className="device-screen">
            <div
              className="statusbar"
              style={{ justifyContent: "space-between" }}
            >
              <Link
                href="/"
                className="btn btn-ghost btn-icon"
                aria-label="Back"
              >
                <Icon name="back" size={18} />
              </Link>
              <span style={{ fontWeight: 600 }}>Past months</span>
              <AddPastTxnButton
                buckets={activeBuckets as Parameters<typeof AddPastTxnButton>[0]["buckets"]}
                currency={currency}
              />
            </div>
            <div
              className="scroll"
              style={{ flex: 1, padding: "8px 20px 28px" }}
            >
              <div className="card" style={{ padding: "4px 4px" }}>
                {months.length === 0 ? (
                  <div style={{ padding: 18, textAlign: "center" }}>
                    <div className="body">No history yet.</div>
                  </div>
                ) : (
                  months.map((m) => (
                    <Link
                      key={m.ym}
                      href={`/months/${m.ym}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <div className="row">
                        <div className="row-icon">
                          <Icon name="calendar" size={16} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>
                            {m.label}
                          </div>
                          <div className="tiny">
                            Saved {fmtMoney(m.saved, currency)} · Gave{" "}
                            {fmtMoney(m.gave, currency)} · Lived{" "}
                            {fmtMoney(m.lived, currency)}
                          </div>
                        </div>
                        <Icon name="chevron" size={14} />
                      </div>
                    </Link>
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
