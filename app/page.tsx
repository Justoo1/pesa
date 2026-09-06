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
  BankAccount,
  BankTransaction,
  BankTransactionKind,
  Bucket,
  BucketColor,
  BucketKind,
  IconName,
  IncomeSource,
  Milestone,
  MilestoneStatus,
  MilestoneTransaction,
  Project,
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
    bankAccounts,
    bankLedger,
    monthlyBankSpend,
    projects,
    milestones,
    milestoneLedger,
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
        tourCompletedAt: true,
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
    prisma.bankAccount.findMany({
      where: { userId, archivedAt: null },
      orderBy: { order: "asc" },
    }),
    prisma.bankTransaction.findMany({
      where: { userId },
      orderBy: { occurredAt: "desc" },
      take: 100,
    }),
    loadMonthlyBankSpend(userId),
    prisma.project.findMany({
      where: { userId, archivedAt: null },
      orderBy: { createdAt: "asc" },
    }),
    prisma.milestone.findMany({
      where: { userId, archivedAt: null },
      orderBy: [{ projectId: "asc" }, { sequenceOrder: "asc" }],
    }),
    prisma.milestoneTransaction.findMany({
      where: { userId },
      orderBy: { occurredAt: "desc" },
      take: 200,
    }),
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
    tourCompleted: !!user.tourCompletedAt,
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
    carryOver: b.carryOver,
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

  const bankAccountsClient: BankAccount[] = bankAccounts.map((a) => ({
    id: a.id,
    name: a.name,
    icon: a.icon as IconName,
    isPrimary: a.isPrimary,
    balance: a.balance,
  }))

  const bankLedgerClient: BankTransaction[] = bankLedger.map((t) => ({
    id: t.id,
    accountId: t.accountId,
    amount: t.amount,
    kind: t.kind as BankTransactionKind,
    note: t.note,
    occurredAt: t.occurredAt.toISOString(),
  }))

  const projectsClient: Project[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    targetAmount: p.targetAmount,
    targetDate: p.targetDate ? p.targetDate.toISOString() : null,
    icon: p.icon as IconName,
  }))

  const milestonesClient: Milestone[] = milestones.map((m) => ({
    id: m.id,
    projectId: m.projectId,
    title: m.title,
    funDetail: m.funDetail,
    targetAmount: m.targetAmount,
    currentSaved: m.currentSaved,
    targetDate: m.targetDate ? m.targetDate.toISOString() : null,
    sequenceOrder: m.sequenceOrder,
    status: m.status as MilestoneStatus,
    bucketId: m.bucketId,
  }))

  const milestoneLedgerClient: MilestoneTransaction[] = milestoneLedger.map((t) => ({
    id: t.id,
    milestoneId: t.milestoneId,
    amount: t.amount,
    note: t.note,
    occurredAt: t.occurredAt.toISOString(),
  }))

  const initialState: AppState = {
    salary: profile.salary,
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
                bankAccounts={bankAccountsClient}
                bankLedger={bankLedgerClient}
                monthlyBankSpend={monthlyBankSpend}
                projects={projectsClient}
                milestones={milestonesClient}
                milestoneLedger={milestoneLedgerClient}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
