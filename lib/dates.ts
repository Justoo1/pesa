/** Calendar helpers shared by the month rollover, payday and bank code. */

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

/**
 * The day payday actually falls on in a given month: a payday of 29–31 lands
 * on the last day of shorter months (Feb, 30-day months) instead of rolling
 * into the next month.
 */
export function effectivePayday(payDay: number, year: number, monthIndex: number): number {
  return Math.min(Math.max(1, payDay), daysInMonth(year, monthIndex))
}

/**
 * Every `paydayDayOfMonth` value whose (clamped) payday is today: just today's
 * date, plus 29–31 when today is the last day of a shorter month. Lets the
 * cron reach a "payday on the 31st" user in February and 30-day months.
 */
export function paydayDaysMatching(today: Date): number[] {
  const day = today.getDate()
  const last = daysInMonth(today.getFullYear(), today.getMonth())
  if (day !== last) return [day]
  return Array.from({ length: 31 - day + 1 }, (_, i) => day + i)
}
