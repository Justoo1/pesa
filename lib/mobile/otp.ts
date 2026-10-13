import { randomInt, createHash } from "crypto"

export function generateLoginCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0")
}

export function hashLoginCode(code: string): string {
  return createHash("sha256").update(code).digest("hex")
}
