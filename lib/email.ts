type SendEmailInput = {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  const apiKey = process.env.AUTH_RESEND_KEY
  const from = process.env.AUTH_EMAIL_FROM?.trim()
  const isProd = process.env.NODE_ENV === "production"

  if (!apiKey || !from) {
    // In production a missing key or sender is a config error — shipping
    // password resets and payday nudges from resend.dev would look broken.
    // In dev / preview we degrade to a log so local flows aren't blocked.
    if (isProd) {
      throw new Error(
        "Email not configured: AUTH_RESEND_KEY and AUTH_EMAIL_FROM are required.",
      )
    }
    console.warn(
      "Email not configured (AUTH_RESEND_KEY or AUTH_EMAIL_FROM missing) — would have emailed",
      to,
    )
    return
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error("Resend email failed:", res.status, body)
  }
}
