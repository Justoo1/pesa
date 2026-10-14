import bcrypt from "bcryptjs"

import { prisma } from "@/lib/db"
import { loginSchema } from "@/lib/mobile/schemas"
import { issueTokenPair } from "@/lib/mobile/auth"
import { BCRYPT_COST, verifyPasswordConstantTime } from "@/lib/account-security"
import { enforceRateLimits, limits, resetRateLimit } from "@/lib/rate-limit"
import { requestIp } from "@/lib/request-ip"
import { HttpError, mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const POST = withMobileRoute(async (request) => {
  const body = loginSchema.parse(await request.json())
  const email = body.email.toLowerCase()
  await enforceRateLimits([limits.loginByEmail(email), limits.loginByIp(requestIp(request))])

  const user = await prisma.user.findUnique({ where: { email } })
  // Always run bcrypt so a missing account takes as long as a wrong password.
  const ok = await verifyPasswordConstantTime(body.password, user?.passwordHash)
  if (!user || !ok) throw new HttpError(401, "UNAUTHORIZED", "Wrong email or password.")

  await resetRateLimit(limits.loginByEmail(email).key)
  // Upgrade hashes made at a lower cost the first time we see the password.
  if (bcrypt.getRounds(user.passwordHash!) < BCRYPT_COST) {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(body.password, BCRYPT_COST) },
    })
  }

  const tokens = await issueTokenPair(user.id, request.headers.get("user-agent"))
  return mobileOk({ ...tokens, user: { id: user.id, email: user.email, name: user.name } })
})
