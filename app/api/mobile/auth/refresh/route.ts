import { prisma } from "@/lib/db"
import { refreshSchema } from "@/lib/mobile/schemas"
import { hashRefreshToken } from "@/lib/mobile/jwt"
import { issueTokenPair } from "@/lib/mobile/auth"
import { HttpError, mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const POST = withMobileRoute(async (request) => {
  const body = refreshSchema.parse(await request.json())
  const hash = hashRefreshToken(body.refreshToken)

  const session = await prisma.mobileSession.findUnique({ where: { refreshTokenHash: hash } })
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new HttpError(401, "UNAUTHORIZED", "Refresh token is invalid or expired.")
  }

  await prisma.mobileSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  })

  const tokens = await issueTokenPair(session.userId, request.headers.get("user-agent"))
  return mobileOk(tokens)
})
