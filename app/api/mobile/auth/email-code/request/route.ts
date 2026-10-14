import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import { requestLoginCodeSchema } from "@/lib/mobile/schemas"
import { generateLoginCode, hashLoginCode } from "@/lib/mobile/otp"
import { HttpError, mobileOk, withMobileRoute } from "@/lib/mobile/response"
import { enforceRateLimits, limits } from "@/lib/rate-limit"
import { requestIp } from "@/lib/request-ip"
import { rememberDevCode } from "@/lib/mobile/dev-codes"

const CODE_TTL_MS = 10 * 60 * 1000 // 10 minutes

export const POST = withMobileRoute(async (request) => {
  const body = requestLoginCodeSchema.parse(await request.json())
  const email = body.email.toLowerCase()
  // Each request mints a fresh 5-guess budget and sends an email, so cap
  // them per inbox and per caller (anti brute force and anti email-bombing).
  await enforceRateLimits(
    [
      limits.emailSendByEmail(email),
      limits.emailSendByEmailDaily(email),
      limits.emailSendByIp(requestIp(request)),
    ],
    "Too many codes requested. Please wait a few minutes and try again.",
  )

  // Invalidate any codes still outstanding for this email before issuing a
  // new one, so only the most recently requested code can ever be verified.
  await prisma.mobileLoginCode.updateMany({
    where: { email, consumedAt: null },
    data: { consumedAt: new Date() },
  })

  const code = generateLoginCode()
  await prisma.mobileLoginCode.create({
    data: {
      email,
      codeHash: hashLoginCode(code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  })

  if (process.env.NODE_ENV !== "production") {
    console.log(`[dev] mobile email-code for ${email}: ${code}`)
    rememberDevCode(email, code)
  }

  try {
    await sendEmail({
      to: email,
      subject: "Your Pesa sign-in code",
      html: `<p>Your Pesa sign-in code is:</p><p style="font-size:24px;font-weight:bold;">${code}</p><p>It expires in 10 minutes. If you didn't request this, ignore this email.</p>`,
      text: `Your Pesa sign-in code is ${code}. It expires in 10 minutes.`,
    })
  } catch (e) {
    console.error("sendEmail (login code) failed:", e)
    throw new HttpError(500, "INTERNAL", "Could not send the code email. Please try again.")
  }

  return mobileOk({ sent: true })
})
