type SendEmailInput = {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  const apiKey = process.env.AUTH_RESEND_KEY
  if (!apiKey) {
    console.warn("AUTH_RESEND_KEY missing — would have emailed", to)
    return
  }
  const from = process.env.AUTH_EMAIL_FROM?.trim() || "Pesa <onboarding@resend.dev>"

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
