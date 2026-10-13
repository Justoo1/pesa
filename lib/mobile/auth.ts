import { prisma } from "@/lib/db"
import { HttpError } from "@/lib/mobile/response"
import {
  MOBILE_ACCESS_TOKEN_TTL_SECONDS,
  generateRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from "@/lib/mobile/jwt"

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export async function requireMobileUserId(request: Request): Promise<string> {
  const header = request.headers.get("authorization")
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null
  if (!token) throw new HttpError(401, "UNAUTHORIZED", "Missing or invalid token")

  try {
    return await verifyAccessToken(token)
  } catch {
    throw new HttpError(401, "UNAUTHORIZED", "Missing or invalid token")
  }
}

export type TokenPair = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export async function issueTokenPair(userId: string, userAgent?: string | null): Promise<TokenPair> {
  const accessToken = await signAccessToken(userId)
  const { token: refreshToken, hash } = generateRefreshToken()

  await prisma.mobileSession.create({
    data: {
      userId,
      refreshTokenHash: hash,
      userAgent: userAgent ?? undefined,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  })

  return { accessToken, refreshToken, expiresIn: MOBILE_ACCESS_TOKEN_TTL_SECONDS }
}
