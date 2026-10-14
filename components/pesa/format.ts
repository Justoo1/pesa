const DECIMAL_CURRENCIES = new Set(["$", "€", "£", "₦", "₹"])

export function fmtMoney(n: number, currency = "GH₵"): string {
  const num = Number(n) || 0
  const wantDecimals = DECIMAL_CURRENCIES.has(currency)
  return `${currency}${num.toLocaleString("en-US", {
    minimumFractionDigits: wantDecimals ? 2 : 0,
    maximumFractionDigits: wantDecimals ? 2 : 0,
  })}`
}

export function fmtMoneyDecimal(n: number, currency = "GH₵"): string {
  const num = Number(n) || 0
  return `${currency}${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function fmtTxnDate(input: Date | string): string {
  const d = input instanceof Date ? input : new Date(input)
  const now = new Date()
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000)
  if (dayDiff === 0) return "Today"
  if (dayDiff === 1) return "Yesterday"
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" })
}

/**
 * What a pot received *this month*: its balance minus anything carried over
 * from last month (carry-over pots). Use this — not `allocated` — for
 * "disbursed / left to disburse" totals against the salary.
 */
export function sentThisMonth(b: { allocated: number; carriedIn?: number }): number {
  return Math.max(0, b.allocated - (b.carriedIn ?? 0))
}
