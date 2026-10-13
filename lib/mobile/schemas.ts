import { z } from "zod"

// Shared with app/actions/auth.ts registerUser so the web and mobile
// registration flows validate identically.
export const registerSchema = z.object({
  name: z.string().min(1).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(120),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export const requestLoginCodeSchema = z.object({
  email: z.string().email(),
})

export const verifyLoginCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
})

// Shared with app/actions/buckets.ts. Note: that file has "use server" at the
// top, and Next.js requires every export from a "use server" file to be an
// async function — schema objects can't live there, hence this module.
export const bucketColorEnum = z.enum(["clay", "green", "gold", "rose", "sage"])
export const bucketKindEnum = z.enum([
  "essential",
  "future",
  "people",
  "give",
  "bills",
  "emergency",
  "debt",
])

export const createBucketSchema = z.object({
  name: z.string().min(1).max(40),
  target: z.number().int().nonnegative(),
  color: bucketColorEnum,
  icon: z.string().min(1).max(20),
  kind: bucketKindEnum,
  dueDayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  carryOver: z.boolean().optional(),
})

export const adjustBucketTargetSchema = z.object({
  bucketId: z.string().min(1),
  delta: z.number().int(),
})

export const archiveBucketSchema = z.object({ bucketId: z.string().min(1) })

export const updateBucketSchema = z.object({
  bucketId: z.string().min(1),
  name: z.string().min(1).max(40),
  target: z.number().int().positive(),
  color: bucketColorEnum,
  icon: z.string().min(1).max(20),
  kind: bucketKindEnum,
  dueDayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  carryOver: z.boolean(),
})

export const reorderBucketsSchema = z.object({
  bucketIds: z.array(z.string().min(1)).min(1),
})

// Shared with app/actions/transactions.ts (also "use server" — see the note
// on the bucket schemas above for why these can't live in that file).
export const disburseSchema = z.object({
  bucketId: z.string().min(1),
  amount: z.number().int().positive(),
  note: z.string().max(200).optional(),
  method: z.string().max(40).optional(),
  occurredAt: z.coerce.date().optional(),
})

export const disburseManySchema = z.object({
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

export const applyPaydayTemplateSchema = z.object({
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

export const spendSchema = z.object({
  bucketId: z.string().min(1),
  amount: z.number().int().positive(),
  note: z.string().max(200).optional(),
  method: z.string().max(40).optional(),
  occurredAt: z.coerce.date().optional(),
})

export const bucketTransferSchema = z
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

// Shared with app/actions/bank.ts (also "use server").
export const addFundsSchema = z.object({
  accountId: z.string().min(1),
  amount: z.number().int().positive(),
  note: z.string().max(200).optional(),
})

export const spendFromBankSchema = z.object({
  accountId: z.string().min(1),
  amount: z.number().int().positive(),
  note: z.string().max(200).optional(),
})

export const createBankAccountSchema = z.object({
  name: z.string().min(1).max(40),
  icon: z.string().min(1).max(20).optional(),
})

export const renameBankAccountSchema = z.object({
  accountId: z.string().min(1),
  name: z.string().min(1).max(40),
})

export const archiveBankAccountSchema = z.object({ accountId: z.string().min(1) })

export const bankTransferSchema = z
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
