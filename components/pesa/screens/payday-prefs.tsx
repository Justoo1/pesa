"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "../icons"
import { Sheet } from "../ui"
import {
  sendTestPush,
  setPaydayPrefs,
  setPushPrefs,
} from "@/app/actions/settings"
import {
  getSubscription,
  isPushSupported,
  subscribe,
  unsubscribe,
} from "@/lib/push-client"

type Props = {
  open: boolean
  onClose: () => void
  initialEnabled: boolean
  initialDay: number | null
  initialPushPayday: boolean
  initialPushBucketHit: boolean
  initialPushWrap: boolean
  initialPushBillsDue: boolean
  initialAutoPayday: boolean
  initialHasSubscription: boolean
}

export function PaydayPrefsSheet(props: Props) {
  if (!props.open) return null
  return <NotificationsContent {...props} />
}

function NotificationsContent({
  onClose,
  initialEnabled,
  initialDay,
  initialPushPayday,
  initialPushBucketHit,
  initialPushWrap,
  initialPushBillsDue,
  initialAutoPayday,
  initialHasSubscription,
}: Props) {
  const router = useRouter()

  const [enabled, setEnabled] = useState(initialEnabled)
  const [day, setDay] = useState<number>(initialDay ?? 28)

  const [pushPayday, setPushPayday] = useState(initialPushPayday)
  const [pushBucketHit, setPushBucketHit] = useState(initialPushBucketHit)
  const [pushWrap, setPushWrap] = useState(initialPushWrap)
  const [pushBillsDue, setPushBillsDue] = useState(initialPushBillsDue)
  const [autoPayday, setAutoPayday] = useState(initialAutoPayday)

  const [hasSub, setHasSub] = useState(initialHasSubscription)
  const [supported] = useState(() => isPushSupported())
  const [pushBusy, setPushBusy] = useState(false)

  const [testNote, setTestNote] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Reconcile the actual browser subscription state with what the server told
  // us — the user might have revoked permission in browser settings between
  // sessions, or subscribed on another device.
  useEffect(() => {
    if (!supported) return
    getSubscription().then((s) => setHasSub(!!s))
  }, [supported])

  const handleEnablePush = async () => {
    setError(null)
    setPushBusy(true)
    try {
      await subscribe()
      setHasSub(true)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not enable push.")
    } finally {
      setPushBusy(false)
    }
  }

  const handleSendTest = async () => {
    setError(null)
    setTestNote(null)
    setPushBusy(true)
    try {
      await sendTestPush()
      setTestNote("Sent — check your notification tray.")
      setTimeout(() => setTestNote(null), 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send test push.")
    } finally {
      setPushBusy(false)
    }
  }

  const handleDisablePush = async () => {
    setError(null)
    setPushBusy(true)
    try {
      await unsubscribe()
      setHasSub(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not disable push.")
    } finally {
      setPushBusy(false)
    }
  }

  const submit = () => {
    setError(null)
    startTransition(async () => {
      try {
        await Promise.all([
          setPaydayPrefs({
            enabled,
            dayOfMonth: enabled ? day : undefined,
            autoPayday,
          }),
          setPushPrefs({
            payday: pushPayday,
            bucketHit: pushBucketHit,
            wrap: pushWrap,
            billsDue: pushBillsDue,
          }),
        ])
        router.refresh()
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save.")
      }
    })
  }

  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true)
  const isiOSSafari =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !isStandalone

  return (
    <Sheet open={true} onClose={onClose} height="86%">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 4px 12px",
        }}
      >
        <button
          className="btn btn-ghost btn-icon"
          onClick={onClose}
          aria-label="Close"
        >
          <Icon name="close" size={18} />
        </button>
        <div className="serif" style={{ fontSize: 22 }}>
          Notifications
        </div>
        <div style={{ width: 44 }}></div>
      </div>

      <div
        style={{
          padding: "0 4px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          overflowY: "auto",
        }}
      >
        <Section title="This device">
          {!supported ? (
            <Note>Push notifications aren&apos;t supported on this browser.</Note>
          ) : isiOSSafari ? (
            <Note>
              On iPhone you need to install Pesa to your home screen first
              (Share → Add to Home Screen), then open it from there to enable
              push.
            </Note>
          ) : hasSub ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  background: "var(--bg-card)",
                  borderRadius: 14,
                  border: "1px solid var(--line)",
                }}
              >
                <span style={{ fontWeight: 600, color: "var(--green)" }}>
                  ✓ Push enabled on this device
                </span>
                <button
                  className="btn btn-ghost"
                  disabled={pushBusy}
                  onClick={handleDisablePush}
                >
                  Unsubscribe
                </button>
              </div>
              <button
                className="btn btn-soft btn-block"
                disabled={pushBusy}
                onClick={handleSendTest}
              >
                <Icon name="send" size={14} />{" "}
                {testNote ?? "Send a test notification"}
              </button>
            </div>
          ) : (
            <button
              className="btn btn-green btn-block"
              disabled={pushBusy}
              onClick={handleEnablePush}
            >
              <Icon name="spark" size={16} /> Enable push on this device
            </button>
          )}
        </Section>

        <Section title="Push">
          <ToggleRow
            label="Payday reminder"
            checked={pushPayday}
            disabled={!hasSub}
            onChange={setPushPayday}
          />
          <ToggleRow
            label="Bucket target reached"
            checked={pushBucketHit}
            disabled={!hasSub}
            onChange={setPushBucketHit}
          />
          <ToggleRow
            label="End-of-month wrap-up"
            checked={pushWrap}
            disabled={!hasSub}
            onChange={setPushWrap}
          />
          <ToggleRow
            label="Bills due soon"
            checked={pushBillsDue}
            disabled={!hasSub}
            onChange={setPushBillsDue}
          />
          {!hasSub && (
            <Note>Enable push on this device above to use these.</Note>
          )}
        </Section>

        <Section title="Auto-payday">
          <ToggleRow
            label="Replay last month on payday"
            checked={autoPayday}
            disabled={!enabled}
            onChange={setAutoPayday}
          />
          <Note>
            On your payday-of-month, Pesa disburses to each pot the same
            amount you sent last month. You&apos;ll get a push so you can
            review. Requires the email reminder above to be on so we know
            the day.
          </Note>
        </Section>

        <Section title="Email">
          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              background: "var(--bg-card)",
              borderRadius: 14,
              border: "1px solid var(--line)",
              cursor: "pointer",
            }}
          >
            <span style={{ fontWeight: 600 }}>Payday email reminder</span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
          </label>
          {enabled && (
            <div>
              <div className="label" style={{ marginBottom: 6 }}>
                Day of the month (1–31)
              </div>
              <input
                className="input num"
                inputMode="numeric"
                value={day}
                onChange={(e) => {
                  const n = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10)
                  if (!Number.isFinite(n)) setDay(1)
                  else setDay(Math.min(31, Math.max(1, n)))
                }}
              />
              <Note>
                Sent around 09:00 UTC. If your timezone is far from UTC the
                reminder may land the day before or after.
              </Note>
            </div>
          )}
        </Section>

        {error && (
          <div
            className="card"
            style={{
              padding: 12,
              background: "var(--clay-soft)",
              color: "var(--clay-deep)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}
      </div>

      <button
        className="btn btn-green btn-block"
        style={{ marginTop: 20 }}
        disabled={isPending}
        onClick={submit}
      >
        <Icon name="check" size={16} /> Save
      </button>
    </Sheet>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="label">{title}</div>
      {children}
    </div>
  )
}

function ToggleRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 14px",
        background: "var(--bg-card)",
        borderRadius: 14,
        border: "1px solid var(--line)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{ fontWeight: 600 }}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="body"
      style={{ fontSize: 13, color: "var(--ink-2)", padding: "4px 4px" }}
    >
      {children}
    </div>
  )
}
