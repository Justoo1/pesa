import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage } from "@/components/legal/legal-page"
import { CONTACT_EMAIL } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Delete your Pesa account",
  description: "How to delete your Pesa account and what gets deleted.",
}

// Public page: Google Play requires an account-deletion URL that works
// without installing the app.
export default function DeleteAccountInfoPage() {
  const subject = encodeURIComponent("Delete my Pesa account")
  return (
    <LegalPage
      title="Delete your account"
      showEffectiveDate={false}
      intro={
        <p>You can delete your Pesa account and all of its data at any time.</p>
      }
    >
      <h2>In the app (Android or iPhone)</h2>
      <ol>
        <li>Open Pesa and sign in.</li>
        <li>
          Go to the <strong>More</strong> tab.
        </li>
        <li>
          Tap <strong>Delete my account</strong>, type your email address to
          confirm, and tap <strong>Delete everything</strong>.
        </li>
      </ol>

      <h2>On the website</h2>
      <ol>
        <li>
          <Link href="/sign-in">Sign in</Link> on this website.
        </li>
        <li>
          Open <strong>More</strong> and choose{" "}
          <strong>Delete my account</strong>, then confirm with your email
          address.
        </li>
      </ol>

      <h2>If you can&rsquo;t sign in</h2>
      <p>
        Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}?subject=${subject}`}>
          {CONTACT_EMAIL}
        </a>{" "}
        from the address on your Pesa account with the subject &ldquo;Delete my
        Pesa account&rdquo;. To protect you, we&rsquo;ll confirm the request
        from that address before deleting anything, and we&rsquo;ll complete it
        within 30 days (usually much sooner).
      </p>

      <h2>What gets deleted</h2>
      <p>Deletion is immediate and permanent. It removes:</p>
      <ul>
        <li>
          your profile (name, email, password hash, app-lock PIN hash,
          settings);
        </li>
        <li>
          all pots, transactions, income sources and bank-account records you
          entered;
        </li>
        <li>projects, milestones and their history;</li>
        <li>
          all sign-in sessions, pending sign-in codes and links, and device push
          tokens.
        </li>
      </ul>
      <p>
        Nothing is kept afterwards except what our hosting provider holds in
        short-lived server logs, which expire on their own. We can&rsquo;t
        recover a deleted account, so if you want a copy first, download your
        transactions in the app or on the website (More → Export this month).
      </p>
    </LegalPage>
  )
}
