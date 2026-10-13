import bcrypt from "bcryptjs"

import { prisma } from "@/lib/db"
import { loginSchema } from "@/lib/mobile/schemas"
import { issueTokenPair } from "@/lib/mobile/auth"
import { HttpError, mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const POST = withMobileRoute(async (request) => {
  const body = loginSchema.parse(await request.json())
  const email = body.email.toLowerCase()

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user?.passwordHash) {
    throw new HttpError(401, "UNAUTHORIZED", "Wrong email or password.")
  }
  const ok = await bcrypt.compare(body.password, user.passwordHash)
  if (!ok) {
    throw new HttpError(401, "UNAUTHORIZED", "Wrong email or password.")
  }

  const tokens = await issueTokenPair(user.id, request.headers.get("user-agent"))
  return mobileOk({ ...tokens, user: { id: user.id, email: user.email, name: user.name } })
})
