import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import {
  loadAnnualMonths,
  loadAvgEssentialsPerMonth,
  loadFilledStreak,
  loadInsights,
  loadPotProjections,
} from "@/lib/insights"
import { loadPaydayTemplate } from "@/lib/payday"
import { ensureCurrentMonth } from "@/lib/month"
import { loadMonthlyBankSpend } from "@/lib/bank"
import { PesaApp } from "@/components/pesa/app"
import { Clock } from "@/components/pesa/clock"
import { LockButton } from "@/components/pesa/lock-button"
import { OnboardingShell } from "@/components/pesa/onboarding/walkthrough"
import type {
  AppState,
  BankTransaction,
  BankTransactionKind,
  Bucket,
  BucketColor,
  BucketKind,
  IconName,
  IncomeSource,
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

  // Roll the live tally over to the current calendar month before reading it,
  // so a new month starts with a full "left to disburse" and an updated label.
  await ensureCurrentMonth(userId)

  const [
    user,
    buckets,
    ledger,
    insights,
    pushCount,
    savingsCount,
    paydayTemplate,
    projections,
    avgEssentialsPerMonth,
    annualMonths,
    filledStreak,
    incomeSources,
    bankLedger,
    monthlyBankSpend,
  ] = await Promise.all([
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
        roundUpStep: true,
        paydayRemindersOn: true,
        paydayDayOfMonth: true,
        appLockEnabled: true,
        pushPaydayOn: true,
        pushBucketHitOn: true,
        pushWrapOn: true,
        pushBillsDueOn: true,
        autoPaydayOn: true,
        onboardedAt: true,
        bankBalance: true,
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
    prisma.bucket.count({
      where: { userId, archivedAt: null, kind: "future" },
    }),
    loadPaydayTemplate(userId),
    loadPotProjections(userId),
    loadAvgEssentialsPerMonth(userId),
    loadAnnualMonths(userId, new Date().getFullYear()),
    loadFilledStreak(userId),
    prisma.incomeSource.findMany({
      where: { userId },
      orderBy: { order: "asc" },
    }),
    prisma.bankTransaction.findMany({
      where: { userId },
      orderBy: { occurredAt: "desc" },
      take: 100,
    }),
    loadMonthlyBankSpend(userId),
  ])

  const profile: UserProfile = {
    id: user.id,
    displayName: user.displayName ?? user.name ?? "Friend",
    email: user.email,
    salary: user.salary,
    currency: user.currency,
    monthLabel: user.monthLabel,
    roundUpsEnabled: user.roundUpsEnabled,
    roundUpStep: user.roundUpStep,
    paydayRemindersOn: user.paydayRemindersOn,
    paydayDayOfMonth: user.paydayDayOfMonth,
    appLockEnabled: user.appLockEnabled,
    pushPaydayOn: user.pushPaydayOn,
    pushBucketHitOn: user.pushBucketHitOn,
    pushWrapOn: user.pushWrapOn,
    pushBillsDueOn: user.pushBillsDueOn,
    autoPaydayOn: user.autoPaydayOn,
    hasPushSubscription: pushCount > 0,
    hasSavingsBucket: savingsCount > 0,
  }

  const bucketsClient: Bucket[] = buckets.map((b) => ({
    id: b.id,
    name: b.name,
    target: b.target,
    allocated: b.allocated,
    spent: b.spent,
    color: b.color as BucketColor,
    icon: b.icon as IconName,
    priority: b.priority,
    kind: b.kind as BucketKind,
    dueDayOfMonth: b.dueDayOfMonth,
    projection: projections[b.id] ?? null,
  }))

  const ledgerClient: Transaction[] = ledger.map((t) => ({
    id: t.id,
    bucketId: t.bucketId,
    amount: t.amount,
    note: t.note,
    method: t.method,
    occurredAt: t.occurredAt.toISOString(),
    transferId: t.transferId,
  }))

  const incomeSourcesClient: IncomeSource[] = incomeSources.map((s) => ({
    id: s.id,
    name: s.name,
    amount: s.amount,
    active: s.active,
  }))

  const bankLedgerClient: BankTransaction[] = bankLedger.map((t) => ({
    id: t.id,
    amount: t.amount,
    kind: t.kind as BankTransactionKind,
    note: t.note,
    occurredAt: t.occurredAt.toISOString(),
  }))

  const initialState: AppState = {
    salary: profile.salary,
    bankBalance: user.bankBalance,
    buckets: bucketsClient,
    ledger: ledgerClient,
  }

  if (!user.onboardedAt) {
    return <OnboardingShell userName={profile.displayName} />
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
              <span className="statusbar-clock">
                <Clock />
              </span>
              <span className="statusbar-slogan">Every cedi, a place to land.</span>
              <span className="statusbar-icons">
                <LockButton appLockEnabled={profile.appLockEnabled} />
              </span>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <PesaApp
                initialState={initialState}
                profile={profile}
                months={insights.months}
                netWorth={insights.netWorth}
                paydayTemplate={paydayTemplate}
                avgEssentialsPerMonth={avgEssentialsPerMonth}
                annualMonths={annualMonths}
                filledStreak={filledStreak}
                incomeSources={incomeSourcesClient}
                bankLedger={bankLedgerClient}
                monthlyBankSpend={monthlyBankSpend}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
