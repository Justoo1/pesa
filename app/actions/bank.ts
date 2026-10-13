"use server"

import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireUserId } from "@/lib/session"
import {
  addFundsSchema,
  archiveBankAccountSchema,
  bankTransferSchema,
  createBankAccountSchema,
  renameBankAccountSchema,
  spendFromBankSchema,
} from "@/lib/mobile/schemas"

async function ownedAccount(userId: string, accountId: string) {
  const account = await prisma.bankAccount.findFirst({
    where: { id: accountId, userId, archivedAt: null },
    select: { id: true, name: true, balance: true, isPrimary: true },
  })
  if (!account) throw new Error("Account not found")
  return account
}

export async function addFundsToBankCore(userId: string, input: z.infer<typeof addFundsSchema>) {
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

export async function addFundsToBank(input: z.infer<typeof addFundsSchema>) {
  const userId = await requireUserId()
  return addFundsToBankCore(userId, input)
}

export async function spendFromBankCore(
  userId: string,
  input: z.infer<typeof spendFromBankSchema>,
) {
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

export async function spendFromBank(input: z.infer<typeof spendFromBankSchema>) {
  const userId = await requireUserId()
  return spendFromBankCore(userId, input)
}

export async function createBankAccountCore(
  userId: string,
  input: z.infer<typeof createBankAccountSchema>,
) {
  const { name, icon } = createBankAccountSchema.parse(input)
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

export async function createBankAccount(input: z.infer<typeof createBankAccountSchema>) {
  const userId = await requireUserId()
  return createBankAccountCore(userId, input)
}

export async function renameBankAccountCore(
  userId: string,
  input: z.infer<typeof renameBankAccountSchema>,
) {
  const { accountId, name } = renameBankAccountSchema.parse(input)
  await prisma.bankAccount.updateMany({
    where: { id: accountId, userId },
    data: { name },
  })
  revalidatePath("/")
}

export async function renameBankAccount(input: z.infer<typeof renameBankAccountSchema>) {
  const userId = await requireUserId()
  return renameBankAccountCore(userId, input)
}

export async function archiveBankAccountCore(
  userId: string,
  input: z.infer<typeof archiveBankAccountSchema>,
) {
  const { accountId } = archiveBankAccountSchema.parse(input)
  const account = await ownedAccount(userId, accountId)
  if (account.isPrimary) throw new Error("Can't archive your primary account")
  if (account.balance !== 0) throw new Error("Move its balance out before archiving")
  await prisma.bankAccount.update({
    where: { id: accountId },
    data: { archivedAt: new Date() },
  })
  revalidatePath("/")
}

export async function archiveBankAccount(input: z.infer<typeof archiveBankAccountSchema>) {
  const userId = await requireUserId()
  return archiveBankAccountCore(userId, input)
}

export async function transferBetweenAccountsCore(
  userId: string,
  input: z.infer<typeof bankTransferSchema>,
) {
  const { fromAccountId, toAccountId, amount, note } = bankTransferSchema.parse(input)
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

export async function transferBetweenAccounts(input: z.infer<typeof bankTransferSchema>) {
  const userId = await requireUserId()
  return transferBetweenAccountsCore(userId, input)
}
