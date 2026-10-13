import { prisma } from "@/lib/db"
import { seedNewUser } from "@/lib/seed"
import { verifyLoginCodeSchema } from "@/lib/mobile/schemas"
import { hashLoginCode } from "@/lib/mobile/otp"
import { issueTokenPair } from "@/lib/mobile/auth"
import { HttpError, mobileOk, withMobileRoute } from "@/lib/mobile/response"

const MAX_ATTEMPTS = 5

export const POST = withMobileRoute(async (request) => {
  const body = verifyLoginCodeSchema.parse(await request.json())
  const email = body.email.toLowerCase()

  const record = await prisma.mobileLoginCode.findFirst({
    where: { email, consumedAt: null },
    orderBy: { createdAt: "desc" },
  })

  if (!record || record.expiresAt < new Date()) {
    throw new HttpError(401, "UNAUTHORIZED", "Code is invalid or expired.")
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    throw new HttpError(401, "UNAUTHORIZED", "Too many attempts. Request a new code.")
  }
  if (hashLoginCode(body.code) !== record.codeHash) {
    await prisma.mobileLoginCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    })
    throw new HttpError(401, "UNAUTHORIZED", "Incorrect code.")
  }

  await prisma.mobileLoginCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  })

  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    user = await prisma.user.create({ data: { email } })
    await seedNewUser(user.id)
  }

  const tokens = await issueTokenPair(user.id, request.headers.get("user-agent"))
  return mobileOk({ ...tokens, user: { id: user.id, email: user.email, name: user.name } })
})
