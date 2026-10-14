import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { ensureCurrentMonth } from "@/lib/month"
import { loadHomeData } from "@/lib/mobile/bootstrap"
import { PesaApp } from "@/components/pesa/app"
import { Clock } from "@/components/pesa/clock"
import { LockButton } from "@/components/pesa/lock-button"
import { LockScreen } from "@/components/pesa/lock-gate"
import { isWebLocked } from "@/lib/app-lock"
import { OnboardingShell } from "@/components/pesa/onboarding/walkthrough"
import type { AppState } from "@/components/pesa/types"

export const dynamic = "force-dynamic"

export default async function Page() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/sign-in")
  }
  const userId = session.user.id

  // App lock is enforced here, on the server: while locked, render only the
  // PIN pad — none of the account's data is loaded or sent to the browser.
  if (await isWebLocked(userId)) {
    return (
      <div className="stage">
        <div className="scene">
          <div className="device">
            <div className="device-screen">
              <div className="statusbar">
                <span className="statusbar-clock">
                  <Clock />
                </span>
                <span className="statusbar-slogan">Every cedi, a place to land.</span>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <LockScreen />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Roll the live tally over to the current calendar month before reading it,
  // so a new month starts with a full "left to disburse" and an updated label.
  await ensureCurrentMonth(userId)

  const {
    profile,
    onboardedAt,
    buckets: bucketsClient,
    ledger: ledgerClient,
    months,
    netWorth,
    paydayTemplate,
    avgEssentialsPerMonth,
    annualMonths,
    filledStreak,
    incomeSources: incomeSourcesClient,
    bankAccounts: bankAccountsClient,
    bankLedger: bankLedgerClient,
    monthlyBankSpend,
    projects: projectsClient,
    milestones: milestonesClient,
    milestoneLedger: milestoneLedgerClient,
  } = await loadHomeData(userId)

  const initialState: AppState = {
    salary: profile.salary,
    buckets: bucketsClient,
    ledger: ledgerClient,
  }

  if (!onboardedAt) {
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
                months={months}
                netWorth={netWorth}
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
