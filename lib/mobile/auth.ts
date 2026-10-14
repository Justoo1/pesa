import { prisma } from "@/lib/db"
import { HttpError } from "@/lib/mobile/response"
import {
  MOBILE_ACCESS_TOKEN_TTL_SECONDS,
  generateRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from "@/lib/mobile/jwt"

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export type MobileAuth = { userId: string; sessionId: string }

/**
 * Authenticates a mobile request: a valid access token whose session is
 * still live (not revoked by logout, password reset or account takeover
 * protection, and not expired). Access tokens therefore die with their
 * session instead of lingering for their full 15 minutes.
 */
export async function requireMobileAuth(
  request: Request,
  opts: { allowLocked?: boolean } = {},
): Promise<MobileAuth> {
  const header = request.headers.get("authorization")
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null
  if (!token) throw new HttpError(401, "UNAUTHORIZED", "Missing or invalid token")

  let claims
  try {
    claims = await verifyAccessToken(token)
  } catch {
    throw new HttpError(401, "UNAUTHORIZED", "Missing or invalid token")
  }
  const session = await prisma.mobileSession.findUnique({
    where: { id: claims.sessionId },
    select: {
      userId: true,
      revokedAt: true,
      expiresAt: true,
      unlockedAt: true,
      user: { select: { appLockEnabled: true } },
    },
  })
  if (
    !session ||
    session.userId !== claims.userId ||
    session.revokedAt ||
    session.expiresAt < new Date()
  ) {
    throw new HttpError(401, "UNAUTHORIZED", "Session has ended — please sign in again")
  }
  // App lock, enforced on the server: a session can't read or change anything
  // until the PIN has been verified on it (see settings/app-lock/verify).
  if (!opts.allowLocked && session.user.appLockEnabled && !session.unlockedAt) {
    throw new HttpError(423, "LOCKED", "Pesa is locked — enter your PIN to continue.")
  }
  return claims
}

export async function requireMobileUserId(
  request: Request,
  opts: { allowLocked?: boolean } = {},
): Promise<string> {
  return (await requireMobileAuth(request, opts)).userId
}

export type TokenPair = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

/**
 * Starts a session. New sign-ins begin locked (if the user has a PIN);
 * a refresh passes the old session's [unlockedAt] so rotation every 15
 * minutes doesn't re-lock the app.
 */
export async function issueTokenPair(
  userId: string,
  userAgent?: string | null,
  opts: { unlockedAt?: Date | null } = {},
): Promise<TokenPair> {
  const { token: refreshToken, hash } = generateRefreshToken()
  const session = await prisma.mobileSession.create({
    data: {
      userId,
      refreshTokenHash: hash,
      userAgent: userAgent ?? undefined,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      unlockedAt: opts.unlockedAt ?? null,
    },
    select: { id: true },
  })
  const accessToken = await signAccessToken(userId, session.id)
  return { accessToken, refreshToken, expiresIn: MOBILE_ACCESS_TOKEN_TTL_SECONDS }
}
