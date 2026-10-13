import { mobileOk, withMobileRoute } from "@/lib/mobile/response"

export const GET = withMobileRoute(async () => {
  return mobileOk({ status: "ok", time: new Date().toISOString() })
})
