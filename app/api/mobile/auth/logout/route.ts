import { prisma } from "@/lib/db"
import { refreshSchema } from "@/lib/mobile/schemas"
import { hashRefreshToken } from "@/lib/mobile/jwt"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

/**
 * Revokes the session for `{ refreshToken }`. Possessing the refresh token
 * is the proof of ownership, so no access token is required — otherwise a
 * client whose 15-minute access token had expired could never revoke its
 * 30-day refresh token on sign-out.
 */
export const POST = withMobileRoute(async (request) => {
  const body = refreshSchema.parse(await request.json())
  const hash = hashRefreshToken(body.refreshToken)

  await prisma.mobileSession.updateMany({
    where: { refreshTokenHash: hash, revokedAt: null },
    data: { revokedAt: new Date() },
  })

  return mobileOk({ loggedOut: true })
})
