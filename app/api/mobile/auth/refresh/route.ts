import { prisma } from "@/lib/db"
import { refreshSchema } from "@/lib/mobile/schemas"
import { hashRefreshToken } from "@/lib/mobile/jwt"
import { issueTokenPair } from "@/lib/mobile/auth"
import { revokeAllSessions } from "@/lib/account-security"
import { HttpError, mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const POST = withMobileRoute(async (request) => {
  const body = refreshSchema.parse(await request.json())
  const hash = hashRefreshToken(body.refreshToken)

  const session = await prisma.mobileSession.findUnique({ where: { refreshTokenHash: hash } })
  if (!session) throw new HttpError(401, "UNAUTHORIZED", "Refresh token is invalid or expired.")

  if (session.revokedAt) {
    // A refresh token is single-use: seeing a rotated (revoked) one again
    // means it was copied. End every session so the copy is useless too.
    if (session.revokedAt.getTime() < Date.now() - 10_000) {
      await revokeAllSessions(prisma, session.userId)
    }
    throw new HttpError(401, "UNAUTHORIZED", "Refresh token is invalid or expired.")
  }
  if (session.expiresAt < new Date()) {
    throw new HttpError(401, "UNAUTHORIZED", "Refresh token is invalid or expired.")
  }

  // Atomic rotation: only one of several concurrent refreshes with the same
  // token can revoke it and receive a new pair.
  const rotated = await prisma.mobileSession.updateMany({
    where: { id: session.id, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  if (rotated.count !== 1) {
    throw new HttpError(401, "UNAUTHORIZED", "Refresh token is invalid or expired.")
  }

  const tokens = await issueTokenPair(session.userId, request.headers.get("user-agent"), {
    unlockedAt: session.unlockedAt,
  })
  return mobileOk(tokens)
})
