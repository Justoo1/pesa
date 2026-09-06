export type BucketColor = "clay" | "green" | "gold" | "rose" | "sage"
export type BucketKind =
  | "essential"
  | "future"
  | "people"
  | "give"
  | "bills"
  | "emergency"
  | "debt"

export type PotProjection = {
  avgPerMonth: number
  lifetimeBalance: number
  monthsToGoal: number | null
  etaIso: string | null
  goalReached: boolean
}

export type IconName =
  | "home"
  | "piggy"
  | "heart"
  | "leaf"
  | "shield"
  | "sun"
  | "broom"
  | "wifi"
  | "flame"
  | "bulb"
  | "plus"
  | "minus"
  | "back"
  | "close"
  | "check"
  | "chevron"
  | "more"
  | "spark"
  | "trend"
  | "wallet"
  | "settings"
  | "calendar"
  | "history"
  | "edit"
  | "send"
  | "scan"
  | "info"
  | "share"
  | "tag"
  | "logout"
  | "help"
  | "flag"
  | "lock"

export type Bucket = {
  id: string
  name: string
  target: number
  allocated: number
  spent: number
  color: BucketColor
  icon: IconName
  priority: number
  kind: BucketKind
  dueDayOfMonth: number | null
  carryOver: boolean
  projection?: PotProjection | null
}

export type Transaction = {
  id: string
  bucketId: string
  /** ISO string when serialised across the server/client boundary */
  occurredAt: string
  amount: number
  note: string
  method: string
  transferId: string | null
}

export type IncomeSource = {
  id: string
  name: string
  amount: number
  active: boolean
}

export type BankAccount = {
  id: string
  name: string
  icon: IconName
  isPrimary: boolean
  balance: number
}

export type BankTransactionKind = "income" | "manual" | "disburse" | "spend" | "milestone"

export type BankTransaction = {
  id: string
  accountId: string
  amount: number
  kind: BankTransactionKind
  note: string
  /** ISO string when serialised across the server/client boundary */
  occurredAt: string
}

export type MilestoneStatus = "locked" | "in_progress" | "completed"

export type Project = {
  id: string
  name: string
  targetAmount: number
  /** ISO string when serialised across the server/client boundary */
  targetDate: string | null
  icon: IconName
}

// Note: unrelated to the local, purely client-side `Milestone` type in
// milestone-banner.tsx (a lifetime-balance celebration banner) — this is the
// persisted roadmap milestone.
export type Milestone = {
  id: string
  projectId: string
  title: string
  funDetail: string
  targetAmount: number
  currentSaved: number
  /** ISO string when serialised across the server/client boundary */
  targetDate: string | null
  sequenceOrder: number
  status: MilestoneStatus
  bucketId: string | null
}

export type MilestoneTransaction = {
  id: string
  milestoneId: string
  amount: number
  note: string
  /** ISO string when serialised across the server/client boundary */
  occurredAt: string
}

export type UserProfile = {
  id: string
  displayName: string
  email: string | null
  salary: number
  currency: string
  monthLabel: string
  roundUpsEnabled: boolean
  roundUpStep: number
  paydayRemindersOn: boolean
  paydayDayOfMonth: number | null
  appLockEnabled: boolean
  pushPaydayOn: boolean
  pushBucketHitOn: boolean
  pushWrapOn: boolean
  pushBillsDueOn: boolean
  autoPaydayOn: boolean
  hasPushSubscription: boolean
  hasSavingsBucket: boolean
  tourCompleted: boolean
}

export type WrapHighlight = {
  iconColor: "sage" | "gold" | "rose"
  icon: IconName
  title: string
  subtitle: string
}

export type MonthRow = {
  month: string
  saved: number
  gave: number
  lived: number
  total: number
}

export type AppState = {
  salary: number
  buckets: Bucket[]
  ledger: Transaction[]
}

export type Action =
  | {
      type: "disburse"
      bucketId: string
      amount: number
      note?: string
      method?: string
    }
  | { type: "adjustTarget"; bucketId: string; delta: number }
  | { type: "setSalary"; salary: number }
  | { type: "reset"; state: AppState }
  | {
      type: "addBucket"
      name: string
      target: number
      color: BucketColor
      icon: IconName
      kind: BucketKind
      dueDayOfMonth?: number | null
    }
  | {
      type: "transfer"
      fromBucketId: string
      toBucketId: string
      amount: number
      note?: string
    }
  | {
      type: "spend"
      bucketId: string
      amount: number
      note?: string
      method?: string
    }
  | {
      type: "payday-replay"
      drafts: Array<{
        bucketId: string
        amount: number
        note?: string
        method?: string
      }>
    }
