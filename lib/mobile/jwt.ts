import { randomBytes, createHash } from "crypto"
import { SignJWT, jwtVerify } from "jose"

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60 // 15 minutes

function getSecretKey() {
  const secret = process.env.MOBILE_JWT_SECRET
  if (!secret) throw new Error("MOBILE_JWT_SECRET is not set")
  return new TextEncoder().encode(secret)
}

export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getSecretKey())
}

export async function verifyAccessToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, getSecretKey())
  if (typeof payload.sub !== "string") throw new Error("Invalid token payload")
  return payload.sub
}

export function generateRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("hex")
  return { token, hash: hashRefreshToken(token) }
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export const MOBILE_ACCESS_TOKEN_TTL_SECONDS = ACCESS_TOKEN_TTL_SECONDS
