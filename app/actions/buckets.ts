"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireUserId } from "@/lib/session"
import {
  adjustBucketTargetSchema,
  archiveBucketSchema,
  createBucketSchema,
  reorderBucketsSchema,
  updateBucketSchema,
} from "@/lib/mobile/schemas"

export async function createBucketCore(userId: string, input: z.infer<typeof createBucketSchema>) {
  const data = createBucketSchema.parse(input)
  const count = await prisma.bucket.count({
    where: { userId, archivedAt: null },
  })
  const bucket = await prisma.bucket.create({
    data: {
      ...data,
      // Only "bills" pots get a due day; if another kind is set with a value
      // we ignore it to keep the model consistent.
      dueDayOfMonth: data.kind === "bills" ? (data.dueDayOfMonth ?? null) : null,
      // Debt payoff is inherently a multi-month goal, same as future/emergency
      // — default it to carry over unless the caller says otherwise.
      carryOver: data.carryOver ?? data.kind === "debt",
      allocated: 0,
      priority: count + 1,
      userId,
    },
  })
  revalidatePath("/")
  return bucket
}

export async function createBucket(input: z.infer<typeof createBucketSchema>) {
  const userId = await requireUserId()
  return createBucketCore(userId, input)
}

export async function adjustTargetCore(
  userId: string,
  input: z.infer<typeof adjustBucketTargetSchema>,
) {
  const { bucketId, delta } = adjustBucketTargetSchema.parse(input)
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

export async function adjustTarget(input: z.infer<typeof adjustBucketTargetSchema>) {
  const userId = await requireUserId()
  return adjustTargetCore(userId, input)
}

export async function archiveBucketCore(
  userId: string,
  input: z.infer<typeof archiveBucketSchema>,
) {
  const { bucketId } = archiveBucketSchema.parse(input)
  await prisma.bucket.updateMany({
    where: { id: bucketId, userId },
    data: { archivedAt: new Date() },
  })
  revalidatePath("/")
}

export async function archiveBucket(input: z.infer<typeof archiveBucketSchema>) {
  const userId = await requireUserId()
  return archiveBucketCore(userId, input)
}

export async function listArchivedBucketsCore(userId: string) {
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

export async function listArchivedBuckets() {
  const userId = await requireUserId()
  return listArchivedBucketsCore(userId)
}

export async function restoreBucketCore(
  userId: string,
  input: z.infer<typeof archiveBucketSchema>,
) {
  const { bucketId } = archiveBucketSchema.parse(input)
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

export async function restoreBucket(input: z.infer<typeof archiveBucketSchema>) {
  const userId = await requireUserId()
  return restoreBucketCore(userId, input)
}

export async function deleteBucketCore(
  userId: string,
  input: z.infer<typeof archiveBucketSchema>,
) {
  const { bucketId } = archiveBucketSchema.parse(input)
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

export async function deleteBucket(input: z.infer<typeof archiveBucketSchema>) {
  const userId = await requireUserId()
  return deleteBucketCore(userId, input)
}

export async function updateBucketCore(userId: string, input: z.infer<typeof updateBucketSchema>) {
  const { bucketId, ...rest } = updateBucketSchema.parse(input)
  await prisma.bucket.updateMany({
    where: { id: bucketId, userId },
    data: {
      ...rest,
      dueDayOfMonth: rest.kind === "bills" ? (rest.dueDayOfMonth ?? null) : null,
    },
  })
  revalidatePath("/")
}

export async function updateBucket(input: z.infer<typeof updateBucketSchema>) {
  const userId = await requireUserId()
  return updateBucketCore(userId, input)
}

export async function reorderBucketsCore(
  userId: string,
  input: z.infer<typeof reorderBucketsSchema>,
) {
  const { bucketIds } = reorderBucketsSchema.parse(input)
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

export async function reorderBuckets(input: z.infer<typeof reorderBucketsSchema>) {
  const userId = await requireUserId()
  return reorderBucketsCore(userId, input)
}
