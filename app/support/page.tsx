import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage } from "@/components/legal/legal-page"
import { CONTACT_EMAIL } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Support — Pesa",
  description: "Get help with the Pesa budgeting app.",
}

export default function SupportPage() {
  return (
    <LegalPage
      title="Support"
      showEffectiveDate={false}
      intro={
        <p>
          Stuck, found a bug, or have an idea? Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we&rsquo;ll get back to you,
          usually within two working days. Telling us your phone model and app version (More →
          About) helps.
        </p>
      }
    >
      <h2>Common questions</h2>

      <h3>Does Pesa move my money?</h3>
      <p>
        No. Pesa is a planner. When you &ldquo;send&rdquo; money to a pot you&rsquo;re recording
        where that part of your salary is meant to go. Pesa never connects to your bank or
        mobile-money account.
      </p>

      <h3>I didn&rsquo;t get my sign-in code or link</h3>
      <p>
        Check your spam or promotions folder, and wait a minute before asking for another one. The
        newest code is the only one that works, and codes expire after a few minutes.
      </p>

      <h3>I forgot my password</h3>
      <p>
        On the sign-in screen, choose to sign in with an email code instead, or use{" "}
        <Link href="/forgot-password">Forgot password</Link> on the website.
      </p>

      <h3>I forgot my app-lock PIN</h3>
      <p>
        After too many wrong tries Pesa signs you out. Sign back in with your email and set a new
        PIN under More → App lock.
      </p>

      <h3>Why can&rsquo;t I send more to a pot?</h3>
      <p>
        A pot can&rsquo;t be filled past its target. Raise the target (open the pot, then Adjust
        target), or send the rest to another pot.
      </p>

      <h3>How do I delete my account?</h3>
      <p>
        In the app: More → Delete my account. More options are on the{" "}
        <Link href="/delete-account">account deletion page</Link>.
      </p>

      <h2>Policies</h2>
      <ul>
        <li>
          <Link href="/privacy">Privacy Policy</Link>
        </li>
        <li>
          <Link href="/terms">Terms of Use</Link>
        </li>
      </ul>
    </LegalPage>
  )
}
