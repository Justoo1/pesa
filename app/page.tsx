import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { loadInsights } from "@/lib/insights"
import { PesaApp } from "@/components/pesa/app"
import { Clock } from "@/components/pesa/clock"
import type {
  AppState,
  Bucket,
  BucketColor,
  BucketKind,
  IconName,
  Transaction,
  UserProfile,
} from "@/components/pesa/types"

export const dynamic = "force-dynamic"

export default async function Page() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/sign-in")
  }
  const userId = session.user.id

  const [user, buckets, ledger, insights, pushCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        displayName: true,
        salary: true,
        currency: true,
        monthLabel: true,
        roundUpsEnabled: true,
        paydayRemindersOn: true,
        paydayDayOfMonth: true,
        appLockEnabled: true,
        pushPaydayOn: true,
        pushBucketHitOn: true,
        pushWrapOn: true,
      },
    }),
    prisma.bucket.findMany({
      where: { userId, archivedAt: null },
      orderBy: { priority: "asc" },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { occurredAt: "desc" },
      take: 200,
    }),
    loadInsights(userId),
    prisma.pushSubscription.count({ where: { userId } }),
  ])

  const profile: UserProfile = {
    id: user.id,
    displayName: user.displayName ?? user.name ?? "Friend",
    email: user.email,
    salary: user.salary,
    currency: user.currency,
    monthLabel: user.monthLabel,
    roundUpsEnabled: user.roundUpsEnabled,
    paydayRemindersOn: user.paydayRemindersOn,
    paydayDayOfMonth: user.paydayDayOfMonth,
    appLockEnabled: user.appLockEnabled,
    pushPaydayOn: user.pushPaydayOn,
    pushBucketHitOn: user.pushBucketHitOn,
    pushWrapOn: user.pushWrapOn,
    hasPushSubscription: pushCount > 0,
  }

  const bucketsClient: Bucket[] = buckets.map((b) => ({
    id: b.id,
    name: b.name,
    target: b.target,
    allocated: b.allocated,
    color: b.color as BucketColor,
    icon: b.icon as IconName,
    priority: b.priority,
    kind: b.kind as BucketKind,
  }))

  const ledgerClient: Transaction[] = ledger.map((t) => ({
    id: t.id,
    bucketId: t.bucketId,
    amount: t.amount,
    note: t.note,
    method: t.method,
    occurredAt: t.occurredAt.toISOString(),
  }))

  const initialState: AppState = {
    salary: profile.salary,
    buckets: bucketsClient,
    ledger: ledgerClient,
  }

  return (
    <div className="stage">
      <div className="scene">
        <div className="scene-copy">
          <div className="scene-tag">
            <span className="dot"></span> Pesa · personal budgeting
          </div>
          <h1>
            Every cedi,
            <br />
            <span className="italic">a place to land.</span>
          </h1>
          <p>
            Payday is a ritual. Move your salary into pots — Rent, Mom, Savings, Tithe — and
            watch each one fill. Pesa tracks what&apos;s left to disburse, what&apos;s already
            where it should be, and how it all adds up over months.
          </p>
        </div>

        <div className="device">
          <div className="device-screen">
            <div className="statusbar">
              <Clock />
              <span className="statusbar-icons">
                <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                  <path
                    d="M1 8h2v3H1zM5 6h2v5H5zM9 4h2v7H9zM13 2h2v9h-2z"
                    fill="currentColor"
                  />
                </svg>
                <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                  <path
                    d="M8 11C4 11 1.5 8 0.5 6.5 2 4 4 2 8 2s6 2 7.5 4.5C14.5 8 12 11 8 11Zm0-2.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
                    fill="currentColor"
                  />
                </svg>
                <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
                  <rect
                    x="0.5"
                    y="0.5"
                    width="22"
                    height="11"
                    rx="3"
                    stroke="currentColor"
                  />
                  <rect x="2" y="2" width="19" height="8" rx="1.5" fill="currentColor" />
                  <rect x="23.5" y="4" width="2" height="4" rx="1" fill="currentColor" />
                </svg>
              </span>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <PesaApp
                initialState={initialState}
                profile={profile}
                months={insights.months}
                netWorth={insights.netWorth}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
