"use server"

import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireUserId } from "@/lib/session"
import { sendPushToUser } from "@/lib/push"
import { applyPaydayTemplateForUser } from "@/lib/payday"
import { getPrimaryAccountId } from "@/lib/bank"
import { fmtMoney } from "@/components/pesa/format"
import {
  applyPaydayTemplateSchema,
  bucketTransferSchema,
  disburseManySchema,
  disburseSchema,
  spendSchema,
} from "@/lib/mobile/schemas"

function isInCurrentCalendarMonth(d: Date) {
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

export async function disburseCore(userId: string, input: z.infer<typeof disburseSchema>) {
  const { bucketId, amount, note, method, occurredAt } = disburseSchema.parse(input)
  // `allocated`/`spent` are a live tally for the *current* calendar month only.
  // A backdated entry belongs to its own past month, so it lands as a
  // Transaction (history) without bumping this month's live tally — otherwise
  // logging a forgotten paycheck would wrongly shrink today's "left to disburse".
  // Round-ups follow the same rule (no remainder spilling into today's pots).
  const inCurrentMonth = !occurredAt || isInCurrentCalendarMonth(occurredAt)
  const allowRoundUp = inCurrentMonth

  const [bucket, user, savingsBucket, primaryAccountId] = await Promise.all([
    prisma.bucket.findFirst({
      where: { id: bucketId, userId, archivedAt: null },
      select: { id: true, name: true, target: true, allocated: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        roundUpsEnabled: true,
        roundUpStep: true,
        pushBucketHitOn: true,
        currency: true,
      },
    }),
    prisma.bucket.findFirst({
      where: { userId, kind: "future", archivedAt: null },
      orderBy: { priority: "asc" },
      select: { id: true, target: true, allocated: true },
    }),
    getPrimaryAccountId(userId),
  ])
  if (!bucket) throw new Error("Bucket not found")

  // A pot can't be filled past its target this month. (Backdated entries
  // don't touch the live tally, so they aren't capped.)
  if (inCurrentMonth) {
    const room = Math.max(0, bucket.target - bucket.allocated)
    if (room === 0) throw new Error(`${bucket.name} is already full`)
    if (amount > room) {
      throw new Error(
        `${bucket.name} only needs ${fmtMoney(room, user?.currency)} more to fill`,
      )
    }
  }

  // Round-up: if enabled, route the rounding remainder to the first future-kind
  // pot (typically "Savings"). Skip when the target pot is the savings pot
  // itself (can't round into yourself), and never past Savings' own target.
  let roundUp = 0
  const step = user?.roundUpStep ?? 50
  if (
    allowRoundUp &&
    user?.roundUpsEnabled &&
    step > 0 &&
    savingsBucket &&
    savingsBucket.id !== bucketId
  ) {
    const remainder = amount % step
    roundUp = remainder === 0 ? 0 : step - remainder
    roundUp = Math.min(roundUp, Math.max(0, savingsBucket.target - savingsBucket.allocated))
  }

  // Interactive transaction so the target check is atomic: each pot's
  // allocation is claimed with a conditional UPDATE that only matches while
  // there's still room, so two concurrent sends can't both overfill a pot.
  await prisma.$transaction(async (tx) => {
    await tx.transaction.create({
      data: {
        userId,
        bucketId,
        amount,
        note: note || "Top-up",
        method: method || "MoMo",
        ...(occurredAt ? { occurredAt } : {}),
      },
    })
    if (!inCurrentMonth) return

    const claimed = await tx.$executeRaw`
      UPDATE "Bucket" SET "allocated" = "allocated" + ${amount}
      WHERE "id" = ${bucketId} AND "allocated" + ${amount} <= "target"`
    if (claimed !== 1) throw new Error(`${bucket.name} doesn't have room for that any more`)
    await tx.bankAccount.update({
      where: { id: primaryAccountId },
      data: { balance: { decrement: amount } },
    })
    await tx.bankTransaction.create({
      data: {
        userId,
        accountId: primaryAccountId,
        amount: -amount,
        kind: "disburse",
        note: `Sent to ${bucket.name}`,
      },
    })

    if (roundUp > 0 && savingsBucket) {
      const roundedIn = await tx.$executeRaw`
        UPDATE "Bucket" SET "allocated" = "allocated" + ${roundUp}
        WHERE "id" = ${savingsBucket.id} AND "allocated" + ${roundUp} <= "target"`
      // Savings filled up concurrently: skip the round-up, keep the disbursement.
      if (roundedIn !== 1) {
        roundUp = 0
        return
      }
      await tx.transaction.create({
        data: {
          userId,
          bucketId: savingsBucket.id,
          amount: roundUp,
          note: "Round-up",
          method: method || "MoMo",
        },
      })
      await tx.bankAccount.update({
        where: { id: primaryAccountId },
        data: { balance: { decrement: roundUp } },
      })
      await tx.bankTransaction.create({
        data: {
          userId,
          accountId: primaryAccountId,
          amount: -roundUp,
          kind: "disburse",
          note: "Round-up",
        },
      })
    }
  })

  // Bucket target reached: fire push if we crossed from below-target to
  // at-or-above-target on this disbursement. Only current-month disbursements
  // trigger — backdated edits shouldn't fire celebrations now.
  const crossedTarget =
    allowRoundUp &&
    bucket.target > 0 &&
    bucket.allocated < bucket.target &&
    bucket.allocated + amount >= bucket.target
  if (crossedTarget && user?.pushBucketHitOn) {
    try {
      await sendPushToUser(userId, {
        title: `${bucket.name} is full 🎉`,
        body: "Target reached.",
        url: "/",
        tag: `bucket-${bucket.id}`,
      })
    } catch (e) {
      console.error("bucket-hit push error", e)
    }
  }

  revalidatePath("/")
  if (occurredAt) {
    const ym = `${occurredAt.getFullYear()}-${String(occurredAt.getMonth() + 1).padStart(2, "0")}`
    revalidatePath("/months")
    revalidatePath(`/months/${ym}`)
  }
  return { roundUp }
}

export async function disburse(input: z.infer<typeof disburseSchema>) {
  const userId = await requireUserId()
  return disburseCore(userId, input)
}

/**
 * Disburse to several pots in one shot — used by the "add to a past month"
 * sheet's bulk mode. Each entry becomes its own Transaction; the live
 * `allocated` tally is only bumped for current-month entries (see `disburse`).
 * Round-ups and bucket-hit pushes are intentionally skipped here — bulk past
 * entries are a catch-up, not a live payday ritual.
 */
export async function disburseManyCore(
  userId: string,
  input: z.infer<typeof disburseManySchema>,
) {
  const { entries, note, method, occurredAt } = disburseManySchema.parse(input)
  const inCurrentMonth = !occurredAt || isInCurrentCalendarMonth(occurredAt)

  // Keep only entries for pots this user actually owns.
  const owned = await prisma.bucket.findMany({
    where: { userId, archivedAt: null, id: { in: entries.map((e) => e.bucketId) } },
    select: { id: true, name: true, target: true, allocated: true },
  })
  const ownedById = new Map(owned.map((b) => [b.id, b]))
  const valid = entries.filter((e) => ownedById.has(e.bucketId))
  if (valid.length === 0) throw new Error("No valid pots")

  // Same rule as a single disbursement: no pot past its target this month.
  if (inCurrentMonth) {
    const perPot = new Map<string, number>()
    for (const e of valid) perPot.set(e.bucketId, (perPot.get(e.bucketId) ?? 0) + e.amount)
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { currency: true } })
    for (const [id, total] of perPot) {
      const b = ownedById.get(id)!
      if (b.allocated + total > b.target) {
        const room = Math.max(0, b.target - b.allocated)
        throw new Error(
          room === 0
            ? `${b.name} is already full`
            : `${b.name} only needs ${fmtMoney(room, user?.currency)} more to fill`,
        )
      }
    }
  }

  const ops: Prisma.PrismaPromise<unknown>[] = []
  for (const e of valid) {
    ops.push(
      prisma.transaction.create({
        data: {
          userId,
          bucketId: e.bucketId,
          amount: e.amount,
          note: note || "Top-up",
          method: method || "MoMo",
          ...(occurredAt ? { occurredAt } : {}),
        },
      }),
    )
    if (inCurrentMonth) {
      ops.push(
        prisma.bucket.update({
          where: { id: e.bucketId },
          data: { allocated: { increment: e.amount } },
        }),
      )
    }
  }
  if (inCurrentMonth) {
    const total = valid.reduce((s, e) => s + e.amount, 0)
    const primaryAccountId = await getPrimaryAccountId(userId)
    ops.push(
      prisma.bankAccount.update({
        where: { id: primaryAccountId },
        data: { balance: { decrement: total } },
      }),
      prisma.bankTransaction.create({
        data: { userId, accountId: primaryAccountId, amount: -total, kind: "disburse", note: "Bulk top-up" },
      }),
    )
  }
  await prisma.$transaction(ops)

  revalidatePath("/")
  if (occurredAt) {
    const ym = `${occurredAt.getFullYear()}-${String(occurredAt.getMonth() + 1).padStart(2, "0")}`
    revalidatePath("/months")
    revalidatePath(`/months/${ym}`)
  }
  return { applied: valid.length }
}

export async function disburseMany(input: z.infer<typeof disburseManySchema>) {
  const userId = await requireUserId()
  return disburseManyCore(userId, input)
}

export async function applyPaydayTemplateCore(
  userId: string,
  input: z.infer<typeof applyPaydayTemplateSchema>,
) {
  const { drafts } = applyPaydayTemplateSchema.parse(input)
  const result = await applyPaydayTemplateForUser(userId, drafts)
  revalidatePath("/")
  return result
}

export async function applyPaydayTemplate(input: z.infer<typeof applyPaydayTemplateSchema>) {
  const userId = await requireUserId()
  return applyPaydayTemplateCore(userId, input)
}

export async function spendCore(userId: string, input: z.infer<typeof spendSchema>) {
  const { bucketId, amount, note, method, occurredAt } = spendSchema.parse(input)
  // Like disbursements, a backdated spend belongs to its own past month: it's
  // recorded as history but doesn't eat into this month's live pot balance.
  const inCurrentMonth = !occurredAt || isInCurrentCalendarMonth(occurredAt)

  const [bucket, user] = await Promise.all([
    prisma.bucket.findFirst({
      where: { id: bucketId, userId, archivedAt: null },
      select: { id: true, name: true, allocated: true, spent: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { currency: true } }),
  ])
  if (!bucket) throw new Error("Pot not found")
  const overLimit = () =>
    new Error(
      `Only ${fmtMoney(Math.max(0, bucket.allocated - bucket.spent), user?.currency)} left in ${bucket.name}`,
    )
  if (inCurrentMonth && amount > bucket.allocated - bucket.spent) throw overLimit()

  await prisma.$transaction(async (tx) => {
    if (inCurrentMonth) {
      // Atomic claim: only matches while the pot still has the money, so two
      // concurrent spends can't both pass the check above.
      const claimed = await tx.$executeRaw`
        UPDATE "Bucket" SET "spent" = "spent" + ${amount}
        WHERE "id" = ${bucketId} AND "allocated" - "spent" >= ${amount}`
      if (claimed !== 1) throw overLimit()
    }
    await tx.transaction.create({
      data: {
        userId,
        bucketId,
        amount: -amount,
        note: note?.trim() || "Spend",
        method: method || "Cash",
        ...(occurredAt ? { occurredAt } : {}),
      },
    })
  })

  revalidatePath("/")
  if (occurredAt) {
    const ym = `${occurredAt.getFullYear()}-${String(occurredAt.getMonth() + 1).padStart(2, "0")}`
    revalidatePath("/months")
    revalidatePath(`/months/${ym}`)
  }
}

export async function spend(input: z.infer<typeof spendSchema>) {
  const userId = await requireUserId()
  return spendCore(userId, input)
}

export async function transferCore(userId: string, input: z.infer<typeof bucketTransferSchema>) {
  const { fromBucketId, toBucketId, amount, note } = bucketTransferSchema.parse(input)

  const [from, to] = await Promise.all([
    prisma.bucket.findFirst({
      where: { id: fromBucketId, userId, archivedAt: null },
      select: { id: true, name: true, allocated: true, spent: true },
    }),
    prisma.bucket.findFirst({
      where: { id: toBucketId, userId, archivedAt: null },
      select: { id: true, name: true, target: true, allocated: true },
    }),
  ])
  if (!from || !to) throw new Error("Pot not found")
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { currency: true } })
  const money = (n: number) => fmtMoney(Math.max(0, n), user?.currency)
  const notEnough = () => new Error(`Only ${money(from.allocated - from.spent)} in ${from.name} to move`)
  // The receiving pot can't be pushed past its target either.
  const noRoom = () =>
    new Error(
      to.target - to.allocated <= 0
        ? `${to.name} is already full`
        : `${to.name} only has room for ${money(to.target - to.allocated)} more`,
    )
  if (from.allocated - from.spent < amount) throw notEnough()
  if (amount > to.target - to.allocated) throw noRoom()

  const transferId = randomUUID()

  // Both sides are claimed with conditional UPDATEs inside one transaction,
  // so concurrent moves can neither overdraw the source nor overfill the
  // destination; any failed claim rolls the whole move back.
  await prisma.$transaction(async (tx) => {
    const out = await tx.$executeRaw`
      UPDATE "Bucket" SET "allocated" = "allocated" - ${amount}
      WHERE "id" = ${fromBucketId} AND "allocated" - "spent" >= ${amount}`
    if (out !== 1) throw notEnough()
    const into = await tx.$executeRaw`
      UPDATE "Bucket" SET "allocated" = "allocated" + ${amount}
      WHERE "id" = ${toBucketId} AND "allocated" + ${amount} <= "target"`
    if (into !== 1) throw noRoom()
    await tx.transaction.create({
      data: {
        userId,
        bucketId: fromBucketId,
        amount: -amount,
        note: note?.trim() || `→ ${to.name}`,
        method: "Transfer",
        transferId,
      },
    })
    await tx.transaction.create({
      data: {
        userId,
        bucketId: toBucketId,
        amount: amount,
        note: note?.trim() || `← ${from.name}`,
        method: "Transfer",
        transferId,
      },
    })
  })

  revalidatePath("/")
}

export async function transfer(input: z.infer<typeof bucketTransferSchema>) {
  const userId = await requireUserId()
  return transferCore(userId, input)
}
