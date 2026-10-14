import { prisma } from "@/lib/db"

/** Thrown when a caller has used up a rate-limit window. */
export class RateLimitError extends Error {
  constructor(
    message: string,
    readonly retryAfterSeconds: number,
  ) {
    super(message)
    this.name = "RateLimitError"
  }
}

/**
 * Fixed-window counter in Postgres (`RateLimit` table), so limits hold across
 * serverless instances. One atomic upsert per hit: the first hit in a window
 * starts it, later hits increment, and an expired window restarts at 1.
 */
export async function hitRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  // Local test runs register dozens of throwaway accounts from one IP; allow
  // switching limits off — but never in production.
  if (process.env.NODE_ENV !== "production" && process.env.RATE_LIMITS_DISABLED === "1") {
    return { allowed: true, retryAfterSeconds: 0 }
  }
  const [row] = await prisma.$queryRaw<{ count: number; retry: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, NOW() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" <= NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= NOW()
        THEN NOW() + make_interval(secs => ${windowSeconds}) ELSE "RateLimit"."resetAt" END
    RETURNING "count", CEIL(EXTRACT(EPOCH FROM ("resetAt" - NOW())))::int AS "retry"`
  return { allowed: row.count <= limit, retryAfterSeconds: Math.max(1, row.retry) }
}

/** Checks several limits at once and throws [RateLimitError] if any is used up. */
export async function enforceRateLimits(
  limits: { key: string; limit: number; windowSeconds: number }[],
  message = "Too many attempts. Please wait a bit and try again.",
): Promise<void> {
  for (const l of limits) {
    const { allowed, retryAfterSeconds } = await hitRateLimit(l.key, l.limit, l.windowSeconds)
    if (!allowed) throw new RateLimitError(message, retryAfterSeconds)
  }
}

/** Clears a counter, e.g. failed-login attempts after a successful login. */
export async function resetRateLimit(key: string): Promise<void> {
  await prisma.rateLimit.deleteMany({ where: { key } })
}

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Named limits so web and mobile apply the same policy. */
export const limits = {
  loginByEmail: (email: string) => ({ key: `login:email:${email}`, limit: 10, windowSeconds: 15 * MINUTE }),
  loginByIp: (ip: string) => ({ key: `login:ip:${ip}`, limit: 40, windowSeconds: 15 * MINUTE }),
  signupByIp: (ip: string) => ({ key: `signup:ip:${ip}`, limit: 10, windowSeconds: HOUR }),
  emailSendByEmail: (email: string) => ({ key: `email-send:email:${email}`, limit: 3, windowSeconds: 15 * MINUTE }),
  emailSendByEmailDaily: (email: string) => ({ key: `email-send:email-day:${email}`, limit: 10, windowSeconds: DAY }),
  emailSendByIp: (ip: string) => ({ key: `email-send:ip:${ip}`, limit: 20, windowSeconds: HOUR }),
  codeVerifyByEmail: (email: string) => ({ key: `code-verify:email:${email}`, limit: 10, windowSeconds: 15 * MINUTE }),
  codeVerifyByIp: (ip: string) => ({ key: `code-verify:ip:${ip}`, limit: 40, windowSeconds: 15 * MINUTE }),
}
