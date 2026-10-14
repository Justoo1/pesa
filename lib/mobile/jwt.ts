import { randomBytes, createHash } from "crypto"
import { SignJWT, jwtVerify } from "jose"

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60 // 15 minutes
const ISSUER = "pesa"
const AUDIENCE = "pesa-mobile"

function getSecretKey() {
  const secret = process.env.MOBILE_JWT_SECRET
  // HS256 needs a real key: refuse anything shorter than 32 bytes.
  if (!secret || secret.length < 32) {
    throw new Error("MOBILE_JWT_SECRET must be set to at least 32 characters")
  }
  return new TextEncoder().encode(secret)
}

export type AccessClaims = { userId: string; sessionId: string }

/** A 15-minute access token bound to one MobileSession (`sid`). */
export async function signAccessToken(userId: string, sessionId: string): Promise<string> {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getSecretKey())
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, getSecretKey(), {
    algorithms: ["HS256"],
    issuer: ISSUER,
    audience: AUDIENCE,
  })
  if (typeof payload.sub !== "string" || typeof payload.sid !== "string") {
    throw new Error("Invalid token payload")
  }
  return { userId: payload.sub, sessionId: payload.sid }
}

export function generateRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("hex")
  return { token, hash: hashRefreshToken(token) }
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export const MOBILE_ACCESS_TOKEN_TTL_SECONDS = ACCESS_TOKEN_TTL_SECONDS
