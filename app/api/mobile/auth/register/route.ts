import bcrypt from "bcryptjs"

import { prisma } from "@/lib/db"
import { seedNewUser } from "@/lib/seed"
import { registerSchema } from "@/lib/mobile/schemas"
import { issueTokenPair } from "@/lib/mobile/auth"
import { HttpError, mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const POST = withMobileRoute(async (request) => {
  const body = registerSchema.parse(await request.json())
  const email = body.email.toLowerCase()

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw new HttpError(409, "CONFLICT", "An account with this email already exists.")
  }

  const passwordHash = await bcrypt.hash(body.password, 10)
  const user = await prisma.user.create({
    data: {
      email,
      name: body.name,
      displayName: body.name,
      passwordHash,
    },
  })
  await seedNewUser(user.id)

  const tokens = await issueTokenPair(user.id, request.headers.get("user-agent"))
  return mobileOk(
    { ...tokens, user: { id: user.id, email: user.email, name: user.name } },
    201,
  )
})
