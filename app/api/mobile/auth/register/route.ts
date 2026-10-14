import bcrypt from "bcryptjs"

import { prisma } from "@/lib/db"
import { seedNewUser } from "@/lib/seed"
import { registerSchema } from "@/lib/mobile/schemas"
import { issueTokenPair } from "@/lib/mobile/auth"
import { BCRYPT_COST } from "@/lib/account-security"
import { enforceRateLimits, limits } from "@/lib/rate-limit"
import { requestIp } from "@/lib/request-ip"
import { HttpError, mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const POST = withMobileRoute(async (request) => {
  const body = registerSchema.parse(await request.json())
  const email = body.email.toLowerCase()
  await enforceRateLimits([limits.signupByIp(requestIp(request))])

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    throw new HttpError(
      409,
      "CONFLICT",
      "Couldn't create that account. If it's yours, sign in or use an email code instead.",
    )
  }

  const passwordHash = await bcrypt.hash(body.password, BCRYPT_COST)
  const user = await prisma.user.create({
    data: {
      email,
      name: body.name,
      displayName: body.name,
      passwordHash,
      // Nobody has proven they own this inbox yet (see lib/account-security.ts).
      passwordUnverified: true,
    },
  })
  await seedNewUser(user.id)

  const tokens = await issueTokenPair(user.id, request.headers.get("user-agent"))
  return mobileOk(
    { ...tokens, user: { id: user.id, email: user.email, name: user.name } },
    201,
  )
})
