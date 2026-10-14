import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { RateLimitError } from "@/lib/rate-limit"

export type MobileErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL"
  | "RATE_LIMITED"
  | "LOCKED"

export class HttpError extends Error {
  status: number
  code: MobileErrorCode

  constructor(status: number, code: MobileErrorCode, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function mobileOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status })
}

export function mobileError(
  status: number,
  code: MobileErrorCode,
  message: string,
  fieldErrors?: Record<string, string[] | undefined>,
) {
  return NextResponse.json(
    { ok: false, error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) } },
    { status },
  )
}

export function withMobileRoute<Params extends Record<string, string> = Record<string, never>>(
  handler: (request: Request, context: { params: Promise<Params> }) => Promise<Response>,
) {
  return async (request: Request, context: { params: Promise<Params> }) => {
    try {
      return await handler(request, context)
    } catch (error) {
      if (error instanceof ZodError) {
        return mobileError(400, "VALIDATION_ERROR", "Invalid request", error.flatten().fieldErrors)
      }
      if (error instanceof HttpError) {
        return mobileError(error.status, error.code, error.message)
      }
      if (error instanceof RateLimitError) {
        const res = mobileError(429, "RATE_LIMITED", error.message)
        res.headers.set("Retry-After", String(error.retryAfterSeconds))
        return res
      }
      // A malformed body makes `request.json()` throw a SyntaxError.
      if (error instanceof SyntaxError) {
        return mobileError(400, "VALIDATION_ERROR", "Request body must be valid JSON")
      }
      // Domain rules in app/actions/* throw plain `Error`s with user-safe
      // messages ("Only ¢50 left in Rent"), so those pass through. Anything
      // else — Prisma errors (which embed file paths and query shapes),
      // TypeErrors, config errors — is logged and hidden behind a 500.
      if (error instanceof Error && error.constructor === Error) {
        return mobileError(400, "CONFLICT", error.message)
      }
      console.error("[mobile api] unhandled error:", error)
      return mobileError(500, "INTERNAL", "Something went wrong. Please try again.")
    }
  }
}
