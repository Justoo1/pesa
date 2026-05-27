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

const updateSchema = z.object({
  bucketId: z.string().min(1),
  name: z.string().min(1).max(40),
  target: z.number().int().nonnegative(),
  color: colorEnum,
  icon: z.string().min(1).max(20),
  kind: kindEnum,
})

export async function updateBucket(input: z.infer<typeof updateSchema>) {
  const userId = await requireUserId()
  const { bucketId, ...rest } = updateSchema.parse(input)
  await prisma.bucket.updateMany({
    where: { id: bucketId, userId },
    data: rest,
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
