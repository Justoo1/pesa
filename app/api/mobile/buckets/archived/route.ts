import { listArchivedBucketsCore } from "@/app/actions/buckets"
import { requireMobileUserId } from "@/lib/mobile/auth"
import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

/** Archived pots, newest first, with how many transactions each has. */
export const GET = withMobileRoute(async (request) => {
  const userId = await requireMobileUserId(request)
  const rows = await listArchivedBucketsCore(userId)
  return mobileOk(
    rows.map((b) => ({
      id: b.id,
      name: b.name,
      color: b.color,
      icon: b.icon,
      kind: b.kind,
      target: b.target,
      archivedAt: b.archivedAt?.toISOString() ?? null,
      txnCount: b._count.txns,
    })),
  )
})
