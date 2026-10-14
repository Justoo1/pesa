import fs from "fs"
import os from "os"
import path from "path"

/**
 * Dev/test only: the latest plaintext email sign-in code per address, kept in
 * a temp file so integration tests running on an emulator (which can't read
 * the dev server's console) can fetch it. Never active in production.
 */
const FILE = path.join(os.tmpdir(), "pesa-dev-login-codes.json")

export const devCodesEnabled = () => process.env.NODE_ENV !== "production"

function readAll(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"))
  } catch {
    return {}
  }
}

export function rememberDevCode(email: string, code: string): void {
  if (!devCodesEnabled()) return
  const all = readAll()
  all[email] = code
  fs.writeFileSync(FILE, JSON.stringify(all))
}

export function latestDevCode(email: string): string | null {
  if (!devCodesEnabled()) return null
  return readAll()[email] ?? null
}
