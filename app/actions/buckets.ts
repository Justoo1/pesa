"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireUserId } from "@/lib/session"

const colorEnum = z.enum(["clay", "green", "gold", "rose", "sage"])
const kindEnum = z.enum(["essential", "future", "people", "give", "bills"])

const createSchema = z.object({
  name: z.string().min(1).max(40),
  target: z.number().int().nonnegative(),
  color: colorEnum,
  icon: z.string().min(1).max(20),
  kind: kindEnum,
  dueDayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
})

export async function createBucket(input: z.infer<typeof createSchema>) {
  const userId = await requireUserId()
  const data = createSchema.parse(input)
  const count = await prisma.bucket.count({
    where: { userId, archivedAt: null },
  })
  const bucket = await prisma.bucket.create({
    data: {
      ...data,
      // Only "bills" pots get a due day; if another kind is set with a value
      // we ignore it to keep the model consistent.
      dueDayOfMonth: data.kind === "bills" ? (data.dueDayOfMonth ?? null) : null,
      allocated: 0,
      priority: count + 1,
      userId,
    },
  })
  revalidatePath("/")
  return bucket
}

const adjustSchema = z.object({
  bucketId: z.string().min(1),
  delta: z.number().int(),
})

export async function adjustTarget(input: z.infer<typeof adjustSchema>) {
  const userId = await requireUserId()
  const { bucketId, delta } = adjustSchema.parse(input)
  const bucket = await prisma.bucket.findFirst({
    where: { id: bucketId, userId },
  })
  if (!bucket) throw new Error("Bucket not found")
  const nextTarget = Math.max(0, bucket.target + delta)
  await prisma.bucket.update({
    where: { id: bucketId },
    data: { target: nextTarget },
  })
  revalidatePath("/")
}

const archiveSchema = z.object({ bucketId: z.string().min(1) })

export async function archiveBucket(input: z.infer<typeof archiveSchema>) {
  const userId = await requireUserId()
  const { bucketId } = archiveSchema.parse(input)
  await prisma.bucket.updateMany({
    where: { id: bucketId, userId },
    data: { archivedAt: new Date() },
  })
  revalidatePath("/")
}

export async function listArchivedBuckets() {
  const userId = await requireUserId()
  return prisma.bucket.findMany({
    where: { userId, archivedAt: { not: null } },
    orderBy: { archivedAt: "desc" },
    select: {
      id: true,
      name: true,
      color: true,
      icon: true,
      kind: true,
      target: true,
      allocated: true,
      archivedAt: true,
      _count: { select: { txns: true } },
    },
  })
}

export async function restoreBucket(input: z.infer<typeof archiveSchema>) {
  const userId = await requireUserId()
  const { bucketId } = archiveSchema.parse(input)
  const owned = await prisma.bucket.findFirst({
    where: { id: bucketId, userId, archivedAt: { not: null } },
    select: { id: true },
  })
  if (!owned) throw new Error("Pot not found")
  // Append to the end of the active list so a restore never disturbs the
  // user's existing pot order.
  const activeCount = await prisma.bucket.count({
    where: { userId, archivedAt: null },
  })
  await prisma.bucket.update({
    where: { id: bucketId },
    data: { archivedAt: null, priority: activeCount + 1 },
  })
  revalidatePath("/")
}

export async function deleteBucket(input: z.infer<typeof archiveSchema>) {
  const userId = await requireUserId()
  const { bucketId } = archiveSchema.parse(input)
  // Only allow hard-delete on already-archived pots so an accidental tap from
  // the main app can never wipe a live pot's history. Cascade in the schema
  // takes care of the transactions.
  const result = await prisma.bucket.deleteMany({
    where: { id: bucketId, userId, archivedAt: { not: null } },
  })
  if (result.count === 0) throw new Error("Pot not found or not archived")
  revalidatePath("/")
  revalidatePath("/months")
}

const updateSchema = z.object({
  bucketId: z.string().min(1),
  name: z.string().min(1).max(40),
  target: z.number().int().positive(),
  color: colorEnum,
  icon: z.string().min(1).max(20),
  kind: kindEnum,
  dueDayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
})

export async function updateBucket(input: z.infer<typeof updateSchema>) {
  const userId = await requireUserId()
  const { bucketId, ...rest } = updateSchema.parse(input)
  await prisma.bucket.updateMany({
    where: { id: bucketId, userId },
    data: {
      ...rest,
      dueDayOfMonth: rest.kind === "bills" ? (rest.dueDayOfMonth ?? null) : null,
    },
  })
  revalidatePath("/")
}

const reorderSchema = z.object({
  bucketIds: z.array(z.string().min(1)).min(1),
})

export async function reorderBuckets(input: z.infer<typeof reorderSchema>) {
  const userId = await requireUserId()
  const { bucketIds } = reorderSchema.parse(input)
  await prisma.$transaction(
    bucketIds.map((id, idx) =>
      prisma.bucket.updateMany({
        where: { id, userId },
        data: { priority: idx + 1 },
      }),
    ),
  )
  revalidatePath("/")
}
