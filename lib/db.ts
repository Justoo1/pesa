import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    // Money moves run as interactive transactions of several round trips; the
    // 5s default is too tight when Neon latency spikes (a cold start or a slow
    // link), and an expired transaction fails the whole move.
    transactionOptions: { maxWait: 10_000, timeout: 20_000 },
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
