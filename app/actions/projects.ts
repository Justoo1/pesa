"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireUserId } from "@/lib/session"
import { getPrimaryAccountId } from "@/lib/bank"

type StatusRow = { id: string; currentSaved: number; targetAmount: number; status: string }

/**
 * Sequential-unlock rule: milestones are funded in `sequenceOrder`. The first
 * one still below its target is "in_progress"; everything after it stays
 * "locked". Anything at/above its own target is "completed" regardless of
 * position (raising a target after completion can un-complete and re-lock
 * later ones).
 */
function computeStatuses(milestones: StatusRow[]) {
  let unlockedAssigned = false
  return milestones.map((m) => {
    let status: string
    if (m.currentSaved >= m.targetAmount) {
      status = "completed"
    } else if (!unlockedAssigned) {
      status = "in_progress"
      unlockedAssigned = true
    } else {
      status = "locked"
    }
    return { id: m.id, status, changed: status !== m.status }
  })
}

async function syncProjectMilestoneStatuses(projectId: string, userId: string) {
  const milestones = await prisma.milestone.findMany({
    where: { projectId, userId, archivedAt: null },
    orderBy: { sequenceOrder: "asc" },
    select: { id: true, currentSaved: true, targetAmount: true, status: true },
  })
  const updates = computeStatuses(milestones).filter((u) => u.changed)
  if (updates.length) {
    await prisma.$transaction(
      updates.map((u) => prisma.milestone.update({ where: { id: u.id }, data: { status: u.status } })),
    )
  }
}

const createProjectSchema = z.object({
  name: z.string().min(1).max(60),
  targetAmount: z.number().int().positive(),
  targetDate: z.coerce.date().optional(),
  icon: z.string().min(1).max(20).optional(),
})

export async function createProject(input: z.infer<typeof createProjectSchema>) {
  const userId = await requireUserId()
  const data = createProjectSchema.parse(input)
  const project = await prisma.project.create({
    data: {
      userId,
      name: data.name.trim(),
      targetAmount: data.targetAmount,
      targetDate: data.targetDate ?? null,
      icon: data.icon ?? "home",
    },
  })
  revalidatePath("/")
  return project
}

const updateProjectSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(60),
  targetAmount: z.number().int().positive(),
  targetDate: z.coerce.date().nullable().optional(),
  icon: z.string().min(1).max(20),
})

export async function updateProject(input: z.infer<typeof updateProjectSchema>) {
  const userId = await requireUserId()
  const { projectId, ...rest } = updateProjectSchema.parse(input)
  await prisma.project.updateMany({
    where: { id: projectId, userId },
    data: { ...rest, targetDate: rest.targetDate ?? null },
  })
  revalidatePath("/")
}

const archiveProjectSchema = z.object({ projectId: z.string().min(1) })

export async function archiveProject(input: z.infer<typeof archiveProjectSchema>) {
  const userId = await requireUserId()
  const { projectId } = archiveProjectSchema.parse(input)
  const now = new Date()
  await prisma.$transaction([
    prisma.project.updateMany({
      where: { id: projectId, userId },
      data: { archivedAt: now },
    }),
    prisma.milestone.updateMany({
      where: { projectId, userId, archivedAt: null },
      data: { archivedAt: now },
    }),
  ])
  revalidatePath("/")
}

const createMilestoneSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(60),
  funDetail: z.string().max(140).optional(),
  targetAmount: z.number().int().positive(),
  targetDate: z.coerce.date().optional(),
  bucketId: z.string().min(1).optional(),
})

export async function createMilestone(input: z.infer<typeof createMilestoneSchema>) {
  const userId = await requireUserId()
  const data = createMilestoneSchema.parse(input)

  const project = await prisma.project.findFirst({
    where: { id: data.projectId, userId, archivedAt: null },
    select: { id: true },
  })
  if (!project) throw new Error("Project not found")

  if (data.bucketId) {
    const owned = await prisma.bucket.findFirst({
      where: { id: data.bucketId, userId, archivedAt: null },
      select: { id: true },
    })
    if (!owned) throw new Error("Pot not found")
  }

  const count = await prisma.milestone.count({
    where: { projectId: data.projectId, archivedAt: null },
  })
  const milestone = await prisma.milestone.create({
    data: {
      userId,
      projectId: data.projectId,
      title: data.title.trim(),
      funDetail: data.funDetail?.trim() || "",
      targetAmount: data.targetAmount,
      targetDate: data.targetDate ?? null,
      bucketId: data.bucketId ?? null,
      sequenceOrder: count + 1,
      status: "locked",
    },
  })
  await syncProjectMilestoneStatuses(data.projectId, userId)
  revalidatePath("/")
  return milestone
}

const updateMilestoneSchema = z.object({
  milestoneId: z.string().min(1),
  title: z.string().min(1).max(60),
  funDetail: z.string().max(140).optional(),
  targetAmount: z.number().int().positive(),
  targetDate: z.coerce.date().nullable().optional(),
  bucketId: z.string().min(1).nullable().optional(),
})

export async function updateMilestone(input: z.infer<typeof updateMilestoneSchema>) {
  const userId = await requireUserId()
  const { milestoneId, bucketId, ...rest } = updateMilestoneSchema.parse(input)

  const milestone = await prisma.milestone.findFirst({
    where: { id: milestoneId, userId, archivedAt: null },
    select: { projectId: true },
  })
  if (!milestone) throw new Error("Milestone not found")

  if (bucketId) {
    const owned = await prisma.bucket.findFirst({
      where: { id: bucketId, userId, archivedAt: null },
      select: { id: true },
    })
    if (!owned) throw new Error("Pot not found")
  }

  await prisma.milestone.updateMany({
    where: { id: milestoneId, userId },
    data: { ...rest, targetDate: rest.targetDate ?? null, bucketId: bucketId ?? null },
  })
  await syncProjectMilestoneStatuses(milestone.projectId, userId)
  revalidatePath("/")
}

const archiveMilestoneSchema = z.object({ milestoneId: z.string().min(1) })

export async function archiveMilestone(input: z.infer<typeof archiveMilestoneSchema>) {
  const userId = await requireUserId()
  const { milestoneId } = archiveMilestoneSchema.parse(input)

  const milestone = await prisma.milestone.findFirst({
    where: { id: milestoneId, userId, archivedAt: null },
    select: { projectId: true },
  })
  if (!milestone) throw new Error("Milestone not found")

  await prisma.milestone.updateMany({
    where: { id: milestoneId, userId },
    data: { archivedAt: new Date() },
  })
  await syncProjectMilestoneStatuses(milestone.projectId, userId)
  revalidatePath("/")
}

const fundMilestoneSchema = z.object({
  milestoneId: z.string().min(1),
  amount: z.number().int().positive(),
  note: z.string().max(200).optional(),
})

export async function fundMilestone(input: z.infer<typeof fundMilestoneSchema>) {
  const userId = await requireUserId()
  const { milestoneId, amount, note } = fundMilestoneSchema.parse(input)

  const milestone = await prisma.milestone.findFirst({
    where: { id: milestoneId, userId, archivedAt: null },
    select: { id: true, projectId: true, status: true },
  })
  if (!milestone) throw new Error("Milestone not found")
  if (milestone.status === "locked") throw new Error("Complete the previous milestone first")

  const primaryAccountId = await getPrimaryAccountId(userId)
  const bank = await prisma.bankAccount.findUnique({
    where: { id: primaryAccountId },
    select: { balance: true },
  })
  if (!bank || bank.balance < amount) throw new Error("Not enough in your bank balance")

  const siblings = await prisma.milestone.findMany({
    where: { projectId: milestone.projectId, userId, archivedAt: null },
    orderBy: { sequenceOrder: "asc" },
    select: { id: true, currentSaved: true, targetAmount: true, status: true },
  })
  const projected = siblings.map((m) =>
    m.id === milestoneId ? { ...m, currentSaved: m.currentSaved + amount } : m,
  )
  const statusUpdates = computeStatuses(projected).filter((u) => u.changed)

  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.milestoneTransaction.create({
      data: { userId, milestoneId, amount, note: note?.trim() || "Add funds" },
    }),
    prisma.milestone.update({
      where: { id: milestoneId },
      data: { currentSaved: { increment: amount } },
    }),
    prisma.bankAccount.update({
      where: { id: primaryAccountId },
      data: { balance: { decrement: amount } },
    }),
    prisma.bankTransaction.create({
      data: {
        userId,
        accountId: primaryAccountId,
        amount: -amount,
        kind: "milestone",
        note: "Milestone funding",
      },
    }),
    ...statusUpdates.map((u) =>
      prisma.milestone.update({ where: { id: u.id }, data: { status: u.status } }),
    ),
  ]

  await prisma.$transaction(ops)
  revalidatePath("/")
}
