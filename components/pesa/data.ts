import type { Bucket } from "./types"

export const initialBuckets: Bucket[] = [
  { id: "rent",     name: "Rent",          target: 3500, allocated: 3500, color: "clay",  icon: "home",   priority: 1,  kind: "essential" },
  { id: "savings",  name: "Savings",       target: 2000, allocated: 1500, color: "green", icon: "piggy",  priority: 2,  kind: "future" },
  { id: "mom",      name: "Mom",           target: 1200, allocated: 1200, color: "rose",  icon: "heart",  priority: 3,  kind: "people" },
  { id: "sip",      name: "SIP",           target: 1500, allocated: 800,  color: "gold",  icon: "leaf",   priority: 4,  kind: "future" },
  { id: "emerg",    name: "Emergency",     target: 800,  allocated: 400,  color: "sage",  icon: "shield", priority: 5,  kind: "future" },
  { id: "tithe",    name: "Tithe",         target: 1400, allocated: 1400, color: "gold",  icon: "sun",    priority: 6,  kind: "give" },
  { id: "house",    name: "House keep",    target: 900,  allocated: 600,  color: "clay",  icon: "broom",  priority: 7,  kind: "essential" },
  { id: "internet", name: "Internet",      target: 280,  allocated: 280,  color: "sage",  icon: "wifi",   priority: 8,  kind: "bills" },
  { id: "gas",      name: "Gas",           target: 220,  allocated: 0,    color: "rose",  icon: "flame",  priority: 9,  kind: "bills" },
  { id: "light",    name: "Light bill",    target: 400,  allocated: 0,    color: "gold",  icon: "bulb",   priority: 10, kind: "bills" },
]

export type SeedLedgerEntry = {
  bucketId: string
  /** Format: "MMM dd" e.g. "May 03" — day is parsed; month/year are forced to current. */
  date: string
  amount: number
  note: string
  method: string
}

export const initialLedger: SeedLedgerEntry[] = [
  { bucketId: "rent",     date: "May 03", amount: 3500, note: "Rent — Mr. Asante",    method: "Transfer" },
  { bucketId: "tithe",    date: "May 03", amount: 1400, note: "First fruits",         method: "Mobile money" },
  { bucketId: "mom",      date: "May 04", amount: 1200, note: "Monthly chop money",   method: "MoMo" },
  { bucketId: "internet", date: "May 05", amount: 280,  note: "Surfline · auto",      method: "Card" },
  { bucketId: "savings",  date: "May 06", amount: 1500, note: "Standing order",       method: "Transfer" },
  { bucketId: "sip",      date: "May 06", amount: 800,  note: "Databank SIP",         method: "Auto-debit" },
  { bucketId: "emerg",    date: "May 08", amount: 400,  note: "Top-up",               method: "Transfer" },
  { bucketId: "house",    date: "May 10", amount: 600,  note: "Groceries · Shoprite", method: "Card" },
]
