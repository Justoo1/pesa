import { auth } from "@/auth"
import { isWebLocked } from "@/lib/app-lock"

/**
 * The signed-in user's id for a web server action. Refuses while the app
 * lock is engaged on this browser, so the PIN can't be bypassed by calling
 * actions directly — pass `allowLocked` only for the unlock flow itself.
 */
export async function requireUserId(opts: { allowLocked?: boolean } = {}): Promise<string> {
  const session = await auth()
  const id = session?.user?.id
  if (!id) throw new Error("Not authenticated")
  if (!opts.allowLocked && (await isWebLocked(id))) {
    throw new Error("Pesa is locked — enter your PIN to continue.")
  }
  return id
}
