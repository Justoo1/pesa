import { timingSafeEqual } from "crypto"
import { prisma } from "@/lib/db"
import { seedNewUser } from "@/lib/seed"
import { verifyLoginCodeSchema } from "@/lib/mobile/schemas"
import { hashLoginCode } from "@/lib/mobile/otp"
import { issueTokenPair } from "@/lib/mobile/auth"
import { claimInboxOwnership } from "@/lib/account-security"
import { enforceRateLimits, limits } from "@/lib/rate-limit"
import { requestIp } from "@/lib/request-ip"
import { HttpError, mobileOk, withMobileRoute } from "@/lib/mobile/response"

const MAX_ATTEMPTS = 5

export const POST = withMobileRoute(async (request) => {
  const body = verifyLoginCodeSchema.parse(await request.json())
  const email = body.email.toLowerCase()
  await enforceRateLimits([limits.codeVerifyByEmail(email), limits.codeVerifyByIp(requestIp(request))])

  const record = await prisma.mobileLoginCode.findFirst({
    where: { email, consumedAt: null },
    orderBy: { createdAt: "desc" },
  })
  if (!record || record.expiresAt < new Date()) {
    throw new HttpError(401, "UNAUTHORIZED", "Code is invalid or expired.")
  }

  // Count the attempt *before* comparing, atomically: parallel guesses can't
  // all slip past the limit the way a separate check-then-increment allowed.
  const counted = await prisma.mobileLoginCode.updateMany({
    where: { id: record.id, consumedAt: null, attempts: { lt: MAX_ATTEMPTS } },
    data: { attempts: { increment: 1 } },
  })
  if (counted.count !== 1) {
    throw new HttpError(401, "UNAUTHORIZED", "Too many attempts. Request a new code.")
  }

  const given = Buffer.from(hashLoginCode(body.code), "hex")
  const expected = Buffer.from(record.codeHash, "hex")
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new HttpError(401, "UNAUTHORIZED", "Incorrect code.")
  }

  // Single use, atomically: two concurrent correct submissions can't both win.
  const consumed = await prisma.mobileLoginCode.updateMany({
    where: { id: record.id, consumedAt: null },
    data: { consumedAt: new Date() },
  })
  if (consumed.count !== 1) {
    throw new HttpError(401, "UNAUTHORIZED", "Code is invalid or expired.")
  }

  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    user = await prisma.user.create({ data: { email, emailVerified: new Date() } })
    await seedNewUser(user.id)
  } else {
    // They just proved they own this inbox: wipe any password set by someone
    // who didn't, and end every older session (account-takeover guard).
    await claimInboxOwnership(user.id)
  }

  const tokens = await issueTokenPair(user.id, request.headers.get("user-agent"))
  return mobileOk({ ...tokens, user: { id: user.id, email: user.email, name: user.name } })
})
