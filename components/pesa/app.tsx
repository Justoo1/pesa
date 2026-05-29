"use client"

import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type {
  Action,
  AppState,
  MonthRow,
  UserProfile,
} from "./types"
import { fmtMoney } from "./format"
import { TabBar, Toast, type TabId } from "./ui"
import { HomeScreen } from "./screens/home"
import { DisburseFlow } from "./screens/disburse"
import { BucketDetailScreen } from "./screens/bucket-detail"
import { InsightsScreen } from "./screens/insights"
import { WrapScreen } from "./screens/wrap"
import { MoreScreen } from "./screens/more"
import { LockGate } from "./lock-gate"
import { PaydayReviewSheet, type PaydayDraft } from "./screens/payday-review"
import {
  applyPaydayTemplate as applyPaydayTemplateAction,
  disburse as disburseAction,
  spend as spendAction,
  transfer as transferAction,
} from "@/app/actions/transactions"
import {
  adjustTarget as adjustTargetAction,
  createBucket as createBucketAction,
} from "@/app/actions/buckets"
import { resetMonth as resetMonthAction } from "@/app/actions/settings"

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "disburse": {
      const { bucketId, amount, note, method } = action
      return {
        ...state,
        buckets: state.buckets.map((b) =>
          b.id === bucketId ? { ...b, allocated: b.allocated + amount } : b,
        ),
        ledger: [
          {
            id: "optimistic-" + Date.now(),
            bucketId,
            occurredAt: new Date().toISOString(),
            amount,
            note: note || "Top-up",
            method: method || "MoMo",
            transferId: null,
          },
          ...state.ledger,
        ],
      }
    }
    case "adjustTarget":
      return {
        ...state,
        buckets: state.buckets.map((b) =>
          b.id === action.bucketId
            ? { ...b, target: Math.max(0, b.target + action.delta) }
            : b,
        ),
      }
    case "setSalary":
      return { ...state, salary: action.salary }
    case "reset":
      return action.state
    case "addBucket": {
      const id = "optimistic-bucket-" + Date.now()
      const priority = state.buckets.length + 1
      return {
        ...state,
        buckets: [
          ...state.buckets,
          {
            id,
            name: action.name,
            target: action.target,
            allocated: 0,
            spent: 0,
            color: action.color,
            icon: action.icon,
            priority,
            kind: action.kind,
            dueDayOfMonth: action.dueDayOfMonth ?? null,
          },
        ],
      }
    }
    case "transfer": {
      const { fromBucketId, toBucketId, amount, note } = action
      const now = new Date().toISOString()
      const from = state.buckets.find((b) => b.id === fromBucketId)
      const to = state.buckets.find((b) => b.id === toBucketId)
      const ts = Date.now()
      const optimisticTransferId = `optimistic-transfer-${ts}`
      return {
        ...state,
        buckets: state.buckets.map((b) => {
          if (b.id === fromBucketId) return { ...b, allocated: b.allocated - amount }
          if (b.id === toBucketId) return { ...b, allocated: b.allocated + amount }
          return b
        }),
        ledger: [
          {
            id: "optimistic-tx-to-" + ts,
            bucketId: toBucketId,
            amount,
            note: note?.trim() || `← ${from?.name ?? "pot"}`,
            method: "Transfer",
            occurredAt: now,
            transferId: optimisticTransferId,
          },
          {
            id: "optimistic-tx-from-" + ts,
            bucketId: fromBucketId,
            amount: -amount,
            note: note?.trim() || `→ ${to?.name ?? "pot"}`,
            method: "Transfer",
            occurredAt: now,
            transferId: optimisticTransferId,
          },
          ...state.ledger,
        ],
      }
    }
    case "spend": {
      const { bucketId, amount, note, method } = action
      return {
        ...state,
        buckets: state.buckets.map((b) =>
          b.id === bucketId ? { ...b, spent: b.spent + amount } : b,
        ),
        ledger: [
          {
            id: "optimistic-spend-" + Date.now(),
            bucketId,
            occurredAt: new Date().toISOString(),
            amount: -amount,
            note: note?.trim() || "Spend",
            method: method || "Cash",
            transferId: null,
          },
          ...state.ledger,
        ],
      }
    }
    case "payday-replay": {
      const ts = Date.now()
      const now = new Date().toISOString()
      const byBucket = new Map<string, number>()
      for (const d of action.drafts) {
        byBucket.set(d.bucketId, (byBucket.get(d.bucketId) ?? 0) + d.amount)
      }
      return {
        ...state,
        buckets: state.buckets.map((b) => {
          const inc = byBucket.get(b.id)
          return inc ? { ...b, allocated: b.allocated + inc } : b
        }),
        ledger: [
          ...action.drafts.map((d, i) => ({
            id: `optimistic-payday-${ts}-${i}`,
            bucketId: d.bucketId,
            occurredAt: now,
            amount: d.amount,
            note: d.note?.trim() || "Payday replay",
            method: d.method || "MoMo",
            transferId: null,
          })),
          ...state.ledger,
        ],
      }
    }
    default:
      return state
  }
}

export function PesaApp({
  initialState,
  profile,
  months,
  netWorth,
  paydayTemplate,
}: {
  initialState: AppState
  profile: UserProfile
  months: MonthRow[]
  netWorth: number
  paydayTemplate: PaydayDraft[]
}) {
  const router = useRouter()
  const [state, dispatch] = useReducer(appReducer, initialState)

  // Sync server-provided initialState into local state whenever the server
  // component re-renders (router.refresh() after a successful mutation).
  useEffect(() => {
    dispatch({ type: "reset", state: initialState })
  }, [initialState])

  const [tab, setTab] = useState<TabId>("home")
  const [activeBucket, setActiveBucket] = useState<string | null>(null)
  const [disburseOpen, setDisburseOpen] = useState(false)
  const [paydayReviewOpen, setPaydayReviewOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const prevLedgerLen = useRef(state.ledger.length)
  useEffect(() => {
    const added = state.ledger.length - prevLedgerLen.current
    if (added > 0) {
      const latest = state.ledger[0]
      const bucket = state.buckets.find((b) => b.id === latest.bucketId)
      if (added > 1 && !latest.transferId && latest.amount > 0) {
        // Payday replay — one toast that totals the run instead of one per row.
        const batch = state.ledger.slice(0, added)
        const total = batch.reduce((s, t) => s + t.amount, 0)
        setToast(
          `${fmtMoney(total, profile.currency)} disbursed across ${added} pot${added === 1 ? "" : "s"}`,
        )
      } else if (latest.transferId && latest.amount > 0) {
        const out = state.ledger[1]
        const fromBucket = out ? state.buckets.find((b) => b.id === out.bucketId) : null
        setToast(
          `${fmtMoney(latest.amount, profile.currency)} moved from ${fromBucket?.name ?? "pot"} to ${bucket?.name ?? "pot"}`,
        )
      } else if (!latest.transferId && latest.amount < 0) {
        setToast(
          `${fmtMoney(Math.abs(latest.amount), profile.currency)} spent from ${bucket?.name ?? ""}`,
        )
      } else if (!latest.transferId) {
        setToast(`${fmtMoney(latest.amount, profile.currency)} sent to ${bucket?.name ?? ""}`)
      }
      const t = setTimeout(() => setToast(null), 2400)
      prevLedgerLen.current = state.ledger.length
      return () => clearTimeout(t)
    }
    prevLedgerLen.current = state.ledger.length
  }, [state.ledger, state.buckets, profile.currency])

  const runAction = useCallback(
    async (op: () => Promise<unknown>) => {
      try {
        await op()
        router.refresh()
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Something went wrong")
        router.refresh()
      }
    },
    [router],
  )

  const handleDispatch = useCallback(
    (action: Action) => {
      // Optimistic local update first.
      dispatch(action)
      // Fire the matching server action; router.refresh() reconciles with truth.
      switch (action.type) {
        case "disburse":
          void runAction(() =>
            disburseAction({
              bucketId: action.bucketId,
              amount: action.amount,
              note: action.note,
              method: action.method,
            }),
          )
          break
        case "adjustTarget":
          void runAction(() =>
            adjustTargetAction({ bucketId: action.bucketId, delta: action.delta }),
          )
          break
        case "addBucket":
          void runAction(() =>
            createBucketAction({
              name: action.name,
              target: action.target,
              color: action.color,
              icon: action.icon,
              kind: action.kind,
              dueDayOfMonth: action.dueDayOfMonth ?? null,
            }),
          )
          break
        case "transfer":
          void runAction(() =>
            transferAction({
              fromBucketId: action.fromBucketId,
              toBucketId: action.toBucketId,
              amount: action.amount,
              note: action.note,
            }),
          )
          break
        case "spend":
          void runAction(() =>
            spendAction({
              bucketId: action.bucketId,
              amount: action.amount,
              note: action.note,
              method: action.method,
            }),
          )
          break
        case "payday-replay":
          void runAction(() =>
            applyPaydayTemplateAction({ drafts: action.drafts }),
          )
          break
        case "reset":
          void runAction(() => resetMonthAction())
          break
        // setSalary handled via Settings panel calling updateProfile directly.
      }
    },
    [runAction],
  )

  let content: React.ReactNode
  if (activeBucket) {
    content = (
      <BucketDetailScreen
        bucketId={activeBucket}
        state={state}
        dispatch={handleDispatch}
        onBack={() => setActiveBucket(null)}
        onOpenDisburse={() => {
          setActiveBucket(null)
          setDisburseOpen(true)
        }}
        currency={profile.currency}
      />
    )
  } else if (tab === "home") {
    content = (
      <HomeScreen
        state={state}
        onOpenBucket={setActiveBucket}
        onOpenDisburse={() => setDisburseOpen(true)}
        onOpenPaydayReview={() => setPaydayReviewOpen(true)}
        paydayTemplateSize={paydayTemplate.length}
        onGoTo={setTab}
        currency={profile.currency}
        userName={profile.displayName}
        monthLabel={profile.monthLabel}
      />
    )
  } else if (tab === "insights") {
    content = (
      <InsightsScreen
        state={state}
        currency={profile.currency}
        months={months}
        netWorth={netWorth}
      />
    )
  } else if (tab === "wrap") {
    content = (
      <WrapScreen
        state={state}
        currency={profile.currency}
        userName={profile.displayName}
        monthLabel={profile.monthLabel}
        months={months}
      />
    )
  } else if (tab === "settings") {
    content = (
      <MoreScreen
        state={state}
        dispatch={handleDispatch}
        currency={profile.currency}
        salary={state.salary}
        profile={profile}
      />
    )
  }

  return (
    <LockGate enabled={profile.appLockEnabled}>
      <div className="scroll" style={{ position: "relative" }}>
        {content}
      </div>

      <TabBar
        current={tab}
        onChange={(t) => {
          setActiveBucket(null)
          setTab(t)
        }}
        onPlus={() => setDisburseOpen(true)}
      />

      <DisburseFlow
        open={disburseOpen}
        onClose={() => setDisburseOpen(false)}
        state={state}
        dispatch={handleDispatch}
        currency={profile.currency}
      />

      <PaydayReviewSheet
        open={paydayReviewOpen}
        onClose={() => setPaydayReviewOpen(false)}
        template={paydayTemplate}
        dispatch={handleDispatch}
        currency={profile.currency}
        monthLabel={profile.monthLabel}
        remainingToDisburse={
          state.salary - state.buckets.reduce((s, b) => s + b.allocated, 0)
        }
      />

      {toast && <Toast>{toast}</Toast>}
    </LockGate>
  )
}
