import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { ShareLanding } from "@/components/pesa/screens/share-landing"
import type { Bucket, BucketColor, BucketKind, IconName } from "@/components/pesa/types"

export const dynamic = "force-dynamic"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function pick(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? ""
  return v ?? ""
}

export default async function SharePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const session = await auth()
  if (!session?.user?.id) {
    // Preserve the share payload across the auth redirect so the user lands
    // back on the spend flow after signing in.
    const qs = new URLSearchParams()
    const t = pick(sp.title)
    const x = pick(sp.text)
    const u = pick(sp.url)
    if (t) qs.set("title", t)
    if (x) qs.set("text", x)
    if (u) qs.set("url", u)
    const callback = `/share${qs.toString() ? `?${qs}` : ""}`
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(callback)}`)
  }

  const userId = session.user.id
  const [user, buckets] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { currency: true, displayName: true, name: true },
    }),
    prisma.bucket.findMany({
      where: { userId, archivedAt: null },
      orderBy: { priority: "asc" },
    }),
  ])

  const bucketsClient: Bucket[] = buckets.map((b) => ({
    id: b.id,
    name: b.name,
    target: b.target,
    allocated: b.allocated,
    spent: b.spent,
    color: b.color as BucketColor,
    icon: b.icon as IconName,
    priority: b.priority,
    kind: b.kind as BucketKind,
    dueDayOfMonth: b.dueDayOfMonth,
  }))

  const sharedText = [pick(sp.title), pick(sp.text), pick(sp.url)]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" · ")

  return (
    <ShareLanding
      sharedText={sharedText}
      buckets={bucketsClient}
      currency={user.currency}
    />
  )
}
