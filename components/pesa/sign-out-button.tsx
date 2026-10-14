"use client"

import { useTransition, type CSSProperties, type ReactNode } from "react"
import { signOutAction } from "@/app/actions/auth"
import { getSubscription } from "@/lib/push-client"

/**
 * Signs out, first removing this browser's push subscription (server and
 * browser) so the next person to use it doesn't get this account's
 * notifications.
 */
export function SignOutButton({
  className,
  style,
  label,
  children,
}: {
  className?: string
  style?: CSSProperties
  label?: string
  children: ReactNode
}) {
  const [pending, startTransition] = useTransition()

  const onClick = () =>
    startTransition(async () => {
      try {
        const sub = await getSubscription()
        if (sub) {
          await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, {
            method: "DELETE",
          })
          await sub.unsubscribe()
        }
      } catch {
        // Best effort — never block signing out on push cleanup.
      }
      await signOutAction()
    })

  return (
    <button
      type="button"
      className={className}
      style={style}
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
