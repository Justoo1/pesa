import bcrypt from "bcryptjs"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"

/** bcrypt cost for new password hashes. */
export const BCRYPT_COST = 12

// A real hash of a random string: comparing against it when there's no user
// (or no password) makes "unknown email" take as long as "wrong password",
// so login timing doesn't reveal which emails have accounts.
const DUMMY_HASH = "$2a$12$QFWVHK0fyIEuC13W8fT2YeqaSxfu6AvDEmfUwQtlH/hts30t/RMc2"

/** Checks a password without leaking (via timing) whether the user exists. */
export async function verifyPasswordConstantTime(
  password: string,
  passwordHash: string | null | undefined,
): Promise<boolean> {
  const ok = await bcrypt.compare(password, passwordHash ?? DUMMY_HASH)
  return ok && !!passwordHash
}

type Db = Prisma.TransactionClient | typeof prisma

/**
 * Ends every existing session for the user: web JWTs stop validating (their
 * stamped `sessionVersion` no longer matches) and all mobile refresh tokens
 * are revoked. Access tokens die with their session (see lib/mobile/auth.ts).
 */
export async function revokeAllSessions(db: Db, userId: string): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } })
  await db.mobileSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

/**
 * Called when someone has just proven they own the account's inbox (magic
 * link, mobile email code). If the account's password was set by someone who
 * never proved that — e.g. an attacker who registered the victim's email
 * first — it's wiped and every older session is ended, so the attacker loses
 * access. Returns the user's current `sessionVersion` (to stamp new sessions).
 */
export async function claimInboxOwnership(userId: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { passwordUnverified: true, emailVerified: true, sessionVersion: true },
    })
    if (user.passwordUnverified) {
      await revokeAllSessions(tx, userId)
      const updated = await tx.user.update({
        where: { id: userId },
        data: { passwordHash: null, passwordUnverified: false, emailVerified: new Date() },
        select: { sessionVersion: true },
      })
      return updated.sessionVersion
    }
    if (!user.emailVerified) {
      await tx.user.update({ where: { id: userId }, data: { emailVerified: new Date() } })
    }
    return user.sessionVersion
  })
}

/**
 * Base URL for links in emails. Must be configured in production — falling
 * back to localhost there would send users broken links.
 */
export function appUrl(): string {
  const url = process.env.AUTH_URL?.replace(/\/$/, "")
  if (url) return url
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_URL must be set in production")
  }
  return "http://localhost:3000"
}

/** Escapes text for safe interpolation into email HTML. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
