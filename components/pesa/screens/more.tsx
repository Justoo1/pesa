"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "../icons"
import { fmtMoney } from "../format"
import type { Action, AppState, IconName, UserProfile } from "../types"
import Link from "next/link"
import { AddPotSheet } from "./add-pot"
import { EditPotSheet } from "./edit-pot"
import { EditProfileSheet } from "./edit-profile"
import { PaydayPrefsSheet } from "./payday-prefs"
import { RoundUpsSheet } from "./round-ups"
import { AppLockSheet } from "./app-lock"
import { AboutSheet } from "./about"
import { ArchivedPotsSheet } from "./archived-pots"
import { DeleteAccountSheet } from "./delete-account"
import { signOutAction } from "@/app/actions/auth"
import { resetMonth } from "@/app/actions/settings"
import { reorderBuckets } from "@/app/actions/buckets"
import { useRef } from "react"
import type { Bucket } from "../types"

function notificationsSummary(profile: UserProfile): string | undefined {
  const parts: string[] = []
  if (profile.hasPushSubscription) parts.push("Push")
  if (profile.paydayRemindersOn) parts.push("Email")
  if (parts.length === 0) return "Off"
  return parts.join(" + ")
}

function SettingRow({
  icon,
  label,
  value,
  toggle,
  off,
  onClick,
  danger,
  nav,
}: {
  icon: IconName
  label: string
  value?: string
  toggle?: boolean
  off?: boolean
  onClick?: () => void
  danger?: boolean
  nav?: boolean
}) {
  // Toggle rows still need to be clickable — the bug was treating them as
  // non-interactive, which dropped the onClick on the floor.
  const isButton = !!onClick
  // Show the chevron whenever this row leads somewhere — either via its own
  // onClick or because a wrapping <a>/<Link> handles the navigation.
  const showChevron = isButton || !!nav
  const Wrapper = isButton ? "button" : "div"
  const wrapperProps = isButton
    ? {
        onClick,
        type: "button" as const,
        style: {
          width: "100%",
          appearance: "none" as const,
          border: 0,
          background: "transparent",
          textAlign: "left" as const,
          cursor: "pointer" as const,
          color: danger ? "var(--clay-deep)" : "inherit",
        },
      }
    : ({} as Record<string, never>)
  return (
    <Wrapper className="row" {...wrapperProps}>
      <div className="row-icon" style={danger ? { background: "var(--clay-soft)", color: "var(--clay-deep)" } : undefined}>
        <Icon name={icon} size={16} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
      </div>
      {toggle ? (
        <div
          style={{
            width: 38,
            height: 22,
            borderRadius: 999,
            background: off ? "var(--line)" : "var(--green)",
            position: "relative",
            transition: "background 200ms ease",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 2,
              left: off ? 2 : 18,
              width: 18,
              height: 18,
              borderRadius: 999,
              background: "var(--bg-app)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              transition: "left 200ms ease",
            }}
          ></div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {value && (
            <span
              className="num small"
              style={{ color: "var(--ink-2)", fontWeight: 500 }}
            >
              {value}
            </span>
          )}
          {showChevron && <Icon name="chevron" size={14} />}
        </div>
      )}
    </Wrapper>
  )
}

function SetupPanel({
  state,
  dispatch,
  currency,
  salary,
}: {
  state: AppState
  dispatch: (a: Action) => void
  currency: string
  salary: number
}) {
  const [addOpen, setAddOpen] = useState(false)
  const [editingBucket, setEditingBucket] = useState<Bucket | null>(null)
  const dragId = useRef<string | null>(null)
  const router = useRouter()
  const [, startReorder] = useTransition()

  const totalTarget = state.buckets.reduce((s, b) => s + b.target, 0)
  const remainingTarget = salary - totalTarget

  const onDrop = (overId: string) => {
    const from = dragId.current
    dragId.current = null
    if (!from || from === overId) return
    const ids = state.buckets.map((b) => b.id)
    const fromIdx = ids.indexOf(from)
    const toIdx = ids.indexOf(overId)
    if (fromIdx < 0 || toIdx < 0) return
    ids.splice(toIdx, 0, ...ids.splice(fromIdx, 1))
    startReorder(async () => {
      try {
        await reorderBuckets({ bucketIds: ids })
        router.refresh()
      } catch {
        // server will reconcile via next refresh
      }
    })
  }

  return (
    <>
      <div style={{ padding: "14px 20px 0" }}>
        <div
          className="card"
          style={{
            padding: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              className="tiny"
              style={{ fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
            >
              Total of targets
            </div>
            <div className="num" style={{ fontWeight: 600, fontSize: 18, marginTop: 2 }}>
              {fmtMoney(totalTarget, currency)}{" "}
              <span style={{ color: "var(--ink-3)", fontWeight: 400, fontSize: 13 }}>
                / {fmtMoney(salary, currency)}
              </span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              className="tiny"
              style={{ fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
            >
              Buffer
            </div>
            <div
              className="num"
              style={{
                fontWeight: 600,
                fontSize: 18,
                marginTop: 2,
                color: remainingTarget >= 0 ? "var(--green-deep)" : "var(--clay-deep)",
              }}
            >
              {remainingTarget >= 0 ? "+" : ""}
              {fmtMoney(remainingTarget, currency)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 20px 8px" }}>
        <div className="card" style={{ padding: "4px 4px" }}>
          {state.buckets.map((b, i) => (
            <div
              key={b.id}
              className="row"
              draggable
              onDragStart={() => {
                dragId.current = b.id
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(b.id)}
              style={{
                borderTop: i === 0 ? "1px solid transparent" : "1px solid var(--line)",
              }}
            >
              <span
                aria-label="Drag to reorder"
                title="Drag to reorder"
                style={{
                  cursor: "grab",
                  color: "var(--ink-3)",
                  marginRight: 2,
                  userSelect: "none",
                  fontSize: 14,
                }}
              >
                ⋮⋮
              </span>
              <button
                type="button"
                onClick={() => setEditingBucket(b)}
                style={{
                  appearance: "none",
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flex: 1,
                  minWidth: 0,
                  textAlign: "left",
                  padding: 0,
                }}
                aria-label={`Edit ${b.name}`}
              >
                <div className={`row-icon ${b.color}`}>
                  <Icon name={b.icon} size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{b.name}</div>
                  <div className="tiny">
                    Priority {b.priority} · {b.kind}
                  </div>
                </div>
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  className="btn btn-ghost btn-icon"
                  style={{ width: 30, height: 30 }}
                  onClick={() =>
                    dispatch({ type: "adjustTarget", bucketId: b.id, delta: -100 })
                  }
                  aria-label="Decrease"
                >
                  <Icon name="minus" size={14} />
                </button>
                <div
                  className="num"
                  style={{
                    minWidth: 64,
                    textAlign: "center",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  {fmtMoney(b.target, currency)}
                </div>
                <button
                  className="btn btn-ghost btn-icon"
                  style={{ width: 30, height: 30 }}
                  onClick={() =>
                    dispatch({ type: "adjustTarget", bucketId: b.id, delta: 100 })
                  }
                  aria-label="Increase"
                >
                  <Icon name="plus" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="tiny" style={{ marginTop: 8, padding: "0 4px" }}>
          Tip: tap a row to rename, recolor or archive; drag the handle to reorder.
        </div>
      </div>

      <div style={{ padding: "12px 20px 28px" }}>
        <button className="btn btn-soft btn-block" onClick={() => setAddOpen(true)}>
          <Icon name="plus" size={16} /> Add a new pot
        </button>
      </div>

      <AddPotSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        dispatch={dispatch}
      />

      <EditPotSheet
        open={!!editingBucket}
        onClose={() => setEditingBucket(null)}
        bucket={editingBucket}
      />
    </>
  )
}

function SettingsPanel({
  currency,
  salary,
  profile,
}: {
  currency: string
  salary: number
  profile: UserProfile
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [paydayOpen, setPaydayOpen] = useState(false)
  const [lockOpen, setLockOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [archivedOpen, setArchivedOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [resetting, startResetting] = useTransition()
  const [roundUpsOpen, setRoundUpsOpen] = useState(false)

  const openEdit = () => setEditOpen(true)

  const handleReset = () => {
    if (
      !window.confirm(
        "Reset this month? This clears every transaction and zeros each pot.",
      )
    )
      return
    startResetting(async () => {
      try {
        await resetMonth()
        router.refresh()
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "Could not reset.")
      }
    })
  }


  return (
    <>
      <div style={{ padding: "14px 20px 0" }}>
        <div className="card" style={{ padding: "4px 4px" }}>
          <SettingRow
            icon="heart"
            label="Name"
            value={profile.displayName}
            onClick={openEdit}
          />
          {profile.email && (
            <SettingRow icon="send" label="Email" value={profile.email} />
          )}
          <SettingRow
            icon="wallet"
            label="Salary"
            value={fmtMoney(salary, currency)}
            onClick={openEdit}
          />
          <SettingRow
            icon="tag"
            label="Currency"
            value={currency}
            onClick={openEdit}
          />
          <SettingRow
            icon="calendar"
            label="Month"
            value={profile.monthLabel}
            onClick={openEdit}
          />
        </div>
      </div>

      <div style={{ padding: "14px 20px 0" }}>
        <div className="card" style={{ padding: "4px 4px" }}>
          <SettingRow
            icon="spark"
            label="Round-ups to Savings"
            value={
              !profile.hasSavingsBucket
                ? "Needs Future pot"
                : profile.roundUpsEnabled
                  ? `On · ${profile.currency} ${profile.roundUpStep}`
                  : "Off"
            }
            onClick={() => setRoundUpsOpen(true)}
          />
          <SettingRow
            icon="info"
            label="Notifications"
            value={notificationsSummary(profile)}
            onClick={() => setPaydayOpen(true)}
          />
          <SettingRow
            icon="scan"
            label="App Lock (PIN)"
            value={profile.appLockEnabled ? "On" : "Off"}
            onClick={() => setLockOpen(true)}
          />
        </div>
      </div>

      <div style={{ padding: "14px 20px 0" }}>
        <div className="card" style={{ padding: "4px 4px" }}>
          <a
            href="/api/export/transactions"
            download
            style={{ textDecoration: "none", color: "inherit", display: "block" }}
          >
            <SettingRow icon="share" label="Export this month" value="CSV" nav />
          </a>
          <Link href="/months" style={{ textDecoration: "none", color: "inherit" }}>
            <SettingRow icon="history" label="View past months" nav />
          </Link>
          <SettingRow
            icon="piggy"
            label="Archived pots"
            onClick={() => setArchivedOpen(true)}
          />
          <SettingRow
            icon="info"
            label="About Pesa"
            value="v0.2"
            onClick={() => setAboutOpen(true)}
          />
        </div>
      </div>

      <div style={{ padding: "14px 20px 0" }}>
        <div className="card" style={{ padding: "4px 4px" }}>
          <SettingRow
            icon="history"
            label={resetting ? "Resetting…" : "Reset this month"}
            onClick={handleReset}
            danger
          />
          <SettingRow
            icon="close"
            label="Delete my account"
            onClick={() => setDeleteOpen(true)}
            danger
          />
        </div>
      </div>

      <div style={{ padding: "14px 20px 28px" }}>
        <form action={signOutAction}>
          <button type="submit" className="btn btn-soft btn-block">
            Sign out
          </button>
        </form>
      </div>

      <EditProfileSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
      />
      <PaydayPrefsSheet
        open={paydayOpen}
        onClose={() => setPaydayOpen(false)}
        initialEnabled={profile.paydayRemindersOn}
        initialDay={profile.paydayDayOfMonth}
        initialPushPayday={profile.pushPaydayOn}
        initialPushBucketHit={profile.pushBucketHitOn}
        initialPushWrap={profile.pushWrapOn}
        initialPushBillsDue={profile.pushBillsDueOn}
        initialAutoPayday={profile.autoPaydayOn}
        initialHasSubscription={profile.hasPushSubscription}
      />
      <RoundUpsSheet
        open={roundUpsOpen}
        onClose={() => setRoundUpsOpen(false)}
        initialEnabled={profile.roundUpsEnabled}
        initialStep={profile.roundUpStep}
        currency={profile.currency}
        hasSavingsBucket={profile.hasSavingsBucket}
      />
      <AppLockSheet
        open={lockOpen}
        onClose={() => setLockOpen(false)}
        enabled={profile.appLockEnabled}
      />
      <AboutSheet open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <ArchivedPotsSheet
        open={archivedOpen}
        onClose={() => setArchivedOpen(false)}
        currency={currency}
      />
      <DeleteAccountSheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        email={profile.email}
      />
    </>
  )
}

export function MoreScreen({
  state,
  dispatch,
  currency,
  salary,
  profile,
}: {
  state: AppState
  dispatch: (a: Action) => void
  currency: string
  salary: number
  profile: UserProfile
}) {
  const [tab, setTab] = useState<"setup" | "settings">("setup")

  return (
    <>
      <div style={{ padding: "8px 20px 0" }}>
        <div
          className="tiny"
          style={{ fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          More
        </div>
        <div className="serif" style={{ fontSize: 30, lineHeight: 1.05 }}>
          Tune your <span className="italic">setup.</span>
        </div>
      </div>
      <div style={{ padding: "12px 20px 0" }}>
        <div
          className="seg"
          style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr" }}
        >
          <button className={tab === "setup" ? "on" : ""} onClick={() => setTab("setup")}>
            Pots & targets
          </button>
          <button
            className={tab === "settings" ? "on" : ""}
            onClick={() => setTab("settings")}
          >
            Settings
          </button>
        </div>
      </div>

      {tab === "setup" && (
        <SetupPanel
          state={state}
          dispatch={dispatch}
          currency={currency}
          salary={salary}
        />
      )}
      {tab === "settings" && (
        <SettingsPanel currency={currency} salary={salary} profile={profile} />
      )}
    </>
  )
}
