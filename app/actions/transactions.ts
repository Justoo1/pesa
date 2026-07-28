"use server"

import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireUserId } from "@/lib/session"
import { sendPushToUser } from "@/lib/push"
import { applyPaydayTemplateForUser } from "@/lib/payday"

const disburseSchema = z.object({
  bucketId: z.string().min(1),
  amount: z.number().int().positive(),
  note: z.string().max(200).optional(),
  method: z.string().max(40).optional(),
  occurredAt: z.coerce.date().optional(),
})

function isInCurrentCalendarMonth(d: Date) {
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

export async function disburse(input: z.infer<typeof disburseSchema>) {
  const userId = await requireUserId()
  const { bucketId, amount, note, method, occurredAt } = disburseSchema.parse(input)
  // `allocated`/`spent` are a live tally for the *current* calendar month only.
  // A backdated entry belongs to its own past month, so it lands as a
  // Transaction (history) without bumping this month's live tally — otherwise
  // logging a forgotten paycheck would wrongly shrink today's "left to disburse".
  // Round-ups follow the same rule (no remainder spilling into today's pots).
  const inCurrentMonth = !occurredAt || isInCurrentCalendarMonth(occurredAt)
  const allowRoundUp = inCurrentMonth

  const [bucket, user, savingsBucket] = await Promise.all([
    prisma.bucket.findFirst({
      where: { id: bucketId, userId },
      select: { id: true, name: true, target: true, allocated: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        roundUpsEnabled: true,
        roundUpStep: true,
        pushBucketHitOn: true,
      },
    }),
    prisma.bucket.findFirst({
      where: { userId, kind: "future", archivedAt: null },
      orderBy: { priority: "asc" },
      select: { id: true },
    }),
  ])
  if (!bucket) throw new Error("Bucket not found")

  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.transaction.create({
      data: {
        userId,
        bucketId,
        amount,
        note: note || "Top-up",
        method: method || "MoMo",
        ...(occurredAt ? { occurredAt } : {}),
      },
    }),
  ]
  if (inCurrentMonth) {
    ops.push(
      prisma.bucket.update({
        where: { id: bucketId },
        data: { allocated: { increment: amount } },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { bankBalance: { decrement: amount } },
      }),
      prisma.bankTransaction.create({
        data: {
          userId,
          amount: -amount,
          kind: "disburse",
          note: `Sent to ${bucket.name}`,
        },
      }),
    )
  }

  // Round-up: if enabled, route the rounding remainder to the first future-kind
  // pot (typically "Savings"). Skip when the target pot is the savings pot
  // itself (can't round into yourself).
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
    if (roundUp > 0) {
      ops.push(
        prisma.transaction.create({
          data: {
            userId,
            bucketId: savingsBucket.id,
            amount: roundUp,
            note: "Round-up",
            method: method || "MoMo",
          },
        }),
        prisma.bucket.update({
          where: { id: savingsBucket.id },
          data: { allocated: { increment: roundUp } },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { bankBalance: { decrement: roundUp } },
        }),
        prisma.bankTransaction.create({
          data: { userId, amount: -roundUp, kind: "disburse", note: "Round-up" },
        }),
      )
    }
  }

  await prisma.$transaction(ops)

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

const disburseManySchema = z.object({
  entries: z
    .array(
      z.object({
        bucketId: z.string().min(1),
        amount: z.number().int().positive(),
      }),
    )
    .min(1)
    .max(50),
  note: z.string().max(200).optional(),
  method: z.string().max(40).optional(),
  occurredAt: z.coerce.date().optional(),
})

/**
 * Disburse to several pots in one shot — used by the "add to a past month"
 * sheet's bulk mode. Each entry becomes its own Transaction; the live
 * `allocated` tally is only bumped for current-month entries (see `disburse`).
 * Round-ups and bucket-hit pushes are intentionally skipped here — bulk past
 * entries are a catch-up, not a live payday ritual.
 */
export async function disburseMany(input: z.infer<typeof disburseManySchema>) {
  const userId = await requireUserId()
  const { entries, note, method, occurredAt } = disburseManySchema.parse(input)
  const inCurrentMonth = !occurredAt || isInCurrentCalendarMonth(occurredAt)

  // Keep only entries for pots this user actually owns.
  const owned = await prisma.bucket.findMany({
    where: { userId, archivedAt: null, id: { in: entries.map((e) => e.bucketId) } },
    select: { id: true },
  })
  const ownedIds = new Set(owned.map((b) => b.id))
  const valid = entries.filter((e) => ownedIds.has(e.bucketId))
  if (valid.length === 0) throw new Error("No valid pots")

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
    ops.push(
      prisma.user.update({
        where: { id: userId },
        data: { bankBalance: { decrement: total } },
      }),
      prisma.bankTransaction.create({
        data: { userId, amount: -total, kind: "disburse", note: "Bulk top-up" },
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

const paydayTemplateSchema = z.object({
  drafts: z
    .array(
      z.object({
        bucketId: z.string().min(1),
        amount: z.number().int().positive(),
        note: z.string().max(200).optional(),
        method: z.string().max(40).optional(),
      }),
    )
    .min(1)
    .max(50),
})

export async function applyPaydayTemplate(
  input: z.infer<typeof paydayTemplateSchema>,
) {
  const userId = await requireUserId()
  const { drafts } = paydayTemplateSchema.parse(input)
  const result = await applyPaydayTemplateForUser(userId, drafts)
  revalidatePath("/")
  return result
}

const spendSchema = z.object({
  bucketId: z.string().min(1),
  amount: z.number().int().positive(),
  note: z.string().max(200).optional(),
  method: z.string().max(40).optional(),
  occurredAt: z.coerce.date().optional(),
})

export async function spend(input: z.infer<typeof spendSchema>) {
  const userId = await requireUserId()
  const { bucketId, amount, note, method, occurredAt } = spendSchema.parse(input)

  const bucket = await prisma.bucket.findFirst({
    where: { id: bucketId, userId, archivedAt: null },
    select: { id: true, name: true, allocated: true, spent: true },
  })
  if (!bucket) throw new Error("Pot not found")

  const available = bucket.allocated - bucket.spent
  if (amount > available) {
    throw new Error(`Only ${available} left in ${bucket.name}`)
  }

  await prisma.$transaction([
    prisma.transaction.create({
      data: {
        userId,
        bucketId,
        amount: -amount,
        note: note?.trim() || "Spend",
        method: method || "Cash",
        ...(occurredAt ? { occurredAt } : {}),
      },
    }),
    prisma.bucket.update({
      where: { id: bucketId },
      data: { spent: { increment: amount } },
    }),
  ])

  revalidatePath("/")
  if (occurredAt) {
    const ym = `${occurredAt.getFullYear()}-${String(occurredAt.getMonth() + 1).padStart(2, "0")}`
    revalidatePath("/months")
    revalidatePath(`/months/${ym}`)
  }
}

const transferSchema = z
  .object({
    fromBucketId: z.string().min(1),
    toBucketId: z.string().min(1),
    amount: z.number().int().positive(),
    note: z.string().max(200).optional(),
  })
  .refine((d) => d.fromBucketId !== d.toBucketId, {
    message: "Pick two different pots",
    path: ["toBucketId"],
  })

export async function transfer(input: z.infer<typeof transferSchema>) {
  const userId = await requireUserId()
  const { fromBucketId, toBucketId, amount, note } = transferSchema.parse(input)

  const [from, to] = await Promise.all([
    prisma.bucket.findFirst({
      where: { id: fromBucketId, userId, archivedAt: null },
      select: { id: true, name: true, allocated: true, spent: true },
    }),
    prisma.bucket.findFirst({
      where: { id: toBucketId, userId, archivedAt: null },
      select: { id: true, name: true },
    }),
  ])
  if (!from || !to) throw new Error("Pot not found")
  const available = from.allocated - from.spent
  if (available < amount) {
    throw new Error(`Only ${available} in ${from.name} to move`)
  }

  const transferId = randomUUID()

  await prisma.$transaction([
    prisma.transaction.create({
      data: {
        userId,
        bucketId: fromBucketId,
        amount: -amount,
        note: note?.trim() || `→ ${to.name}`,
        method: "Transfer",
        transferId,
      },
    }),
    prisma.transaction.create({
      data: {
        userId,
        bucketId: toBucketId,
        amount: amount,
        note: note?.trim() || `← ${from.name}`,
        method: "Transfer",
        transferId,
      },
    }),
    prisma.bucket.update({
      where: { id: fromBucketId },
      data: { allocated: { decrement: amount } },
    }),
    prisma.bucket.update({
      where: { id: toBucketId },
      data: { allocated: { increment: amount } },
    }),
  ])

  revalidatePath("/")
}
