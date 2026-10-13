import { prisma } from "@/lib/db"
import { refreshSchema } from "@/lib/mobile/schemas"
import { hashRefreshToken } from "@/lib/mobile/jwt"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const POST = withMobileRoute(async (request) => {
  const userId = await requireMobileUserId(request)
  const body = refreshSchema.parse(await request.json())
  const hash = hashRefreshToken(body.refreshToken)

  await prisma.mobileSession.updateMany({
    where: { userId, refreshTokenHash: hash, revokedAt: null },
    data: { revokedAt: new Date() },
  })

  return mobileOk({ loggedOut: true })
})
