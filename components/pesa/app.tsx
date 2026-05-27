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
import { disburse as disburseAction } from "@/app/actions/transactions"
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
            color: action.color,
            icon: action.icon,
            priority,
            kind: action.kind,
          },
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
}: {
  initialState: AppState
  profile: UserProfile
  months: MonthRow[]
  netWorth: number
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
  const [toast, setToast] = useState<string | null>(null)

  const prevLedgerLen = useRef(state.ledger.length)
  useEffect(() => {
    if (state.ledger.length > prevLedgerLen.current) {
      const latest = state.ledger[0]
      const bucket = state.buckets.find((b) => b.id === latest.bucketId)
      setToast(`${fmtMoney(latest.amount, profile.currency)} sent to ${bucket?.name ?? ""}`)
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
            }),
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

      {toast && <Toast>{toast}</Toast>}
    </LockGate>
  )
}
