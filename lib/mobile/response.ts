import { NextResponse } from "next/server"
import { ZodError } from "zod"

export type MobileErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL"

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
      if (error instanceof Error) {
        return mobileError(400, "CONFLICT", error.message)
      }
      return mobileError(500, "INTERNAL", "Something went wrong")
    }
  }
}
