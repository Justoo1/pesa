"use server"

import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireUserId } from "@/lib/session"

async function ownedAccount(userId: string, accountId: string) {
  const account = await prisma.bankAccount.findFirst({
    where: { id: accountId, userId, archivedAt: null },
    select: { id: true, name: true, balance: true, isPrimary: true },
  })
  if (!account) throw new Error("Account not found")
  return account
}

const addFundsSchema = z.object({
  accountId: z.string().min(1),
  amount: z.number().int().positive(),
  note: z.string().max(200).optional(),
})

export async function addFundsToBank(input: z.infer<typeof addFundsSchema>) {
  const userId = await requireUserId()
  const { accountId, amount, note } = addFundsSchema.parse(input)
  await ownedAccount(userId, accountId)
  await prisma.$transaction([
    prisma.bankTransaction.create({
      data: { userId, accountId, amount, kind: "manual", note: note?.trim() || "Added funds" },
    }),
    prisma.bankAccount.update({
      where: { id: accountId },
      data: { balance: { increment: amount } },
    }),
  ])
  revalidatePath("/")
}

const spendFromBankSchema = z.object({
  accountId: z.string().min(1),
  amount: z.number().int().positive(),
  note: z.string().max(200).optional(),
})

export async function spendFromBank(input: z.infer<typeof spendFromBankSchema>) {
  const userId = await requireUserId()
  const { accountId, amount, note } = spendFromBankSchema.parse(input)
  await ownedAccount(userId, accountId)
  await prisma.$transaction([
    prisma.bankTransaction.create({
      data: {
        userId,
        accountId,
        amount: -amount,
        kind: "spend",
        note: note?.trim() || "Personal spend",
      },
    }),
    prisma.bankAccount.update({
      where: { id: accountId },
      data: { balance: { decrement: amount } },
    }),
  ])
  revalidatePath("/")
}

const createAccountSchema = z.object({
  name: z.string().min(1).max(40),
  icon: z.string().min(1).max(20).optional(),
})

export async function createBankAccount(input: z.infer<typeof createAccountSchema>) {
  const userId = await requireUserId()
  const { name, icon } = createAccountSchema.parse(input)
  const count = await prisma.bankAccount.count({ where: { userId, archivedAt: null } })
  const account = await prisma.bankAccount.create({
    data: {
      userId,
      name,
      icon: icon || "wallet",
      isPrimary: count === 0,
      order: count,
    },
  })
  revalidatePath("/")
  return account
}

const renameAccountSchema = z.object({
  accountId: z.string().min(1),
  name: z.string().min(1).max(40),
})

export async function renameBankAccount(input: z.infer<typeof renameAccountSchema>) {
  const userId = await requireUserId()
  const { accountId, name } = renameAccountSchema.parse(input)
  await prisma.bankAccount.updateMany({
    where: { id: accountId, userId },
    data: { name },
  })
  revalidatePath("/")
}

const archiveAccountSchema = z.object({ accountId: z.string().min(1) })

export async function archiveBankAccount(input: z.infer<typeof archiveAccountSchema>) {
  const userId = await requireUserId()
  const { accountId } = archiveAccountSchema.parse(input)
  const account = await ownedAccount(userId, accountId)
  if (account.isPrimary) throw new Error("Can't archive your primary account")
  if (account.balance !== 0) throw new Error("Move its balance out before archiving")
  await prisma.bankAccount.update({
    where: { id: accountId },
    data: { archivedAt: new Date() },
  })
  revalidatePath("/")
}

const transferSchema = z
  .object({
    fromAccountId: z.string().min(1),
    toAccountId: z.string().min(1),
    amount: z.number().int().positive(),
    note: z.string().max(200).optional(),
  })
  .refine((d) => d.fromAccountId !== d.toAccountId, {
    message: "Pick two different accounts",
    path: ["toAccountId"],
  })

export async function transferBetweenAccounts(input: z.infer<typeof transferSchema>) {
  const userId = await requireUserId()
  const { fromAccountId, toAccountId, amount, note } = transferSchema.parse(input)
  const [from, to] = await Promise.all([
    ownedAccount(userId, fromAccountId),
    ownedAccount(userId, toAccountId),
  ])
  const transferId = randomUUID()
  await prisma.$transaction([
    prisma.bankTransaction.create({
      data: {
        userId,
        accountId: fromAccountId,
        amount: -amount,
        kind: "manual",
        note: note?.trim() || `→ ${to.name}`,
        transferId,
      },
    }),
    prisma.bankTransaction.create({
      data: {
        userId,
        accountId: toAccountId,
        amount,
        kind: "manual",
        note: note?.trim() || `← ${from.name}`,
        transferId,
      },
    }),
    prisma.bankAccount.update({
      where: { id: fromAccountId },
      data: { balance: { decrement: amount } },
    }),
    prisma.bankAccount.update({
      where: { id: toAccountId },
      data: { balance: { increment: amount } },
    }),
  ])
  revalidatePath("/")
}
