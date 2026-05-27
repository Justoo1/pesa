export type BucketColor = "clay" | "green" | "gold" | "rose" | "sage"
export type BucketKind = "essential" | "future" | "people" | "give" | "bills"

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

export type Bucket = {
  id: string
  name: string
  target: number
  allocated: number
  color: BucketColor
  icon: IconName
  priority: number
  kind: BucketKind
}

export type Transaction = {
  id: string
  bucketId: string
  /** ISO string when serialised across the server/client boundary */
  occurredAt: string
  amount: number
  note: string
  method: string
}

export type UserProfile = {
  id: string
  displayName: string
  email: string | null
  salary: number
  currency: string
  monthLabel: string
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
    }
