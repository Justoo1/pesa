"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireUserId } from "@/lib/session"
import { getPrimaryAccountId } from "@/lib/bank"
import {
  archiveMilestoneSchema,
  archiveProjectSchema,
  createMilestoneSchema,
  createProjectSchema,
  fundMilestoneSchema,
  updateMilestoneSchema,
  updateProjectSchema,
} from "@/lib/mobile/schemas"

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

export async function createProjectCore(userId: string, input: z.infer<typeof createProjectSchema>) {
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

export async function updateProjectCore(userId: string, input: z.infer<typeof updateProjectSchema>) {
  const { projectId, ...rest } = updateProjectSchema.parse(input)
  await prisma.project.updateMany({
    where: { id: projectId, userId },
    data: { ...rest, targetDate: rest.targetDate ?? null },
  })
  revalidatePath("/")
}

/**
 * Returns the money saved toward [milestoneIds] to the primary bank account
 * (it was debited from the bank when funded), zeroing each milestone and
 * leaving a ledger trail on both sides. Runs inside the caller's transaction.
 */
async function refundMilestones(
  tx: Prisma.TransactionClient,
  userId: string,
  milestoneIds: string[],
) {
  if (milestoneIds.length === 0) return
  const rows = await tx.milestone.findMany({
    where: { id: { in: milestoneIds }, userId, currentSaved: { gt: 0 } },
    select: { id: true, title: true, currentSaved: true },
  })
  if (rows.length === 0) return
  const primaryAccountId = await getPrimaryAccountId(userId)
  for (const m of rows) {
    await tx.milestoneTransaction.create({
      data: { userId, milestoneId: m.id, amount: -m.currentSaved, note: "Returned to bank" },
    })
    await tx.milestone.update({ where: { id: m.id }, data: { currentSaved: 0 } })
    await tx.bankTransaction.create({
      data: {
        userId,
        accountId: primaryAccountId,
        amount: m.currentSaved,
        kind: "milestone",
        note: `Returned from ${m.title}`,
      },
    })
  }
  const total = rows.reduce((sum, m) => sum + m.currentSaved, 0)
  await tx.bankAccount.update({
    where: { id: primaryAccountId },
    data: { balance: { increment: total } },
  })
}

export async function archiveProjectCore(userId: string, input: z.infer<typeof archiveProjectSchema>) {
  const { projectId } = archiveProjectSchema.parse(input)
  const now = new Date()
  // Archiving hides the project, so the money saved in its milestones goes
  // back to the bank instead of vanishing from every view.
  await prisma.$transaction(async (tx) => {
    const project = await tx.project.updateMany({
      where: { id: projectId, userId, archivedAt: null },
      data: { archivedAt: now },
    })
    if (project.count !== 1) throw new Error("Project not found")
    const live = await tx.milestone.findMany({
      where: { projectId, userId, archivedAt: null },
      select: { id: true },
    })
    await refundMilestones(tx, userId, live.map((m) => m.id))
    await tx.milestone.updateMany({
      where: { projectId, userId, archivedAt: null },
      data: { archivedAt: now },
    })
  })
  revalidatePath("/")
}

export async function createMilestoneCore(userId: string, input: z.infer<typeof createMilestoneSchema>) {
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

export async function updateMilestoneCore(userId: string, input: z.infer<typeof updateMilestoneSchema>) {
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

export async function archiveMilestoneCore(userId: string, input: z.infer<typeof archiveMilestoneSchema>) {
  const { milestoneId } = archiveMilestoneSchema.parse(input)

  const milestone = await prisma.milestone.findFirst({
    where: { id: milestoneId, userId, archivedAt: null },
    select: { projectId: true },
  })
  if (!milestone) throw new Error("Milestone not found")

  await prisma.$transaction(async (tx) => {
    await refundMilestones(tx, userId, [milestoneId])
    await tx.milestone.updateMany({
      where: { id: milestoneId, userId },
      data: { archivedAt: new Date() },
    })
  })
  await syncProjectMilestoneStatuses(milestone.projectId, userId)
  revalidatePath("/")
}

export async function fundMilestoneCore(userId: string, input: z.infer<typeof fundMilestoneSchema>) {
  const { milestoneId, amount, note } = fundMilestoneSchema.parse(input)

  const milestone = await prisma.milestone.findFirst({
    where: { id: milestoneId, userId, archivedAt: null },
    select: { id: true, projectId: true, status: true },
  })
  if (!milestone) throw new Error("Milestone not found")
  if (milestone.status === "locked") throw new Error("Complete the previous milestone first")

  const primaryAccountId = await getPrimaryAccountId(userId)

  const siblings = await prisma.milestone.findMany({
    where: { projectId: milestone.projectId, userId, archivedAt: null },
    orderBy: { sequenceOrder: "asc" },
    select: { id: true, currentSaved: true, targetAmount: true, status: true },
  })
  const projected = siblings.map((m) =>
    m.id === milestoneId ? { ...m, currentSaved: m.currentSaved + amount } : m,
  )
  const statusUpdates = computeStatuses(projected).filter((u) => u.changed)

  await prisma.$transaction(async (tx) => {
    // Atomic debit: only succeeds while the bank still covers it, so a
    // double-submit can't overdraw the account.
    const debited = await tx.$executeRaw`
      UPDATE "BankAccount" SET "balance" = "balance" - ${amount}
      WHERE "id" = ${primaryAccountId} AND "balance" >= ${amount}`
    if (debited !== 1) throw new Error("Not enough in your bank balance")
    await tx.milestoneTransaction.create({
      data: { userId, milestoneId, amount, note: note?.trim() || "Add funds" },
    })
    await tx.milestone.update({
      where: { id: milestoneId },
      data: { currentSaved: { increment: amount } },
    })
    await tx.bankTransaction.create({
      data: {
        userId,
        accountId: primaryAccountId,
        amount: -amount,
        kind: "milestone",
        note: "Milestone funding",
      },
    })
    for (const u of statusUpdates) {
      await tx.milestone.update({ where: { id: u.id }, data: { status: u.status } })
    }
  })
  revalidatePath("/")
}

export async function createProject(input: z.infer<typeof createProjectSchema>) {
  const userId = await requireUserId()
  return createProjectCore(userId, input)
}

export async function updateProject(input: z.infer<typeof updateProjectSchema>) {
  const userId = await requireUserId()
  return updateProjectCore(userId, input)
}

export async function archiveProject(input: z.infer<typeof archiveProjectSchema>) {
  const userId = await requireUserId()
  return archiveProjectCore(userId, input)
}

export async function createMilestone(input: z.infer<typeof createMilestoneSchema>) {
  const userId = await requireUserId()
  return createMilestoneCore(userId, input)
}

export async function updateMilestone(input: z.infer<typeof updateMilestoneSchema>) {
  const userId = await requireUserId()
  return updateMilestoneCore(userId, input)
}

export async function archiveMilestone(input: z.infer<typeof archiveMilestoneSchema>) {
  const userId = await requireUserId()
  return archiveMilestoneCore(userId, input)
}

export async function fundMilestone(input: z.infer<typeof fundMilestoneSchema>) {
  const userId = await requireUserId()
  return fundMilestoneCore(userId, input)
}
