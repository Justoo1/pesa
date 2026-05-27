export function fmtMoney(n: number, currency = "GH₵"): string {
  const num = Number(n) || 0
  return `${currency}${num.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
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
