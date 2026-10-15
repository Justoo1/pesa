import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage } from "@/components/legal/legal-page"
import { CONTACT_EMAIL, COUNTRY, PUBLISHER_NAME, SITE_URL } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Privacy Policy — Pesa",
  description: "What Pesa collects, why, who processes it, and how to delete it.",
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          Pesa is a personal budgeting app: you plan where your salary goes by sending it into
          &ldquo;pots&rdquo;. This policy explains what we collect when you use the Pesa app for
          Android and iOS and the website at <a href={SITE_URL}>{SITE_URL.replace("https://", "")}</a>,
          why, and the choices you have. The short version: we collect only what the app needs to
          work, we don&rsquo;t sell your data, we don&rsquo;t show ads, and we don&rsquo;t track you.
        </p>
      }
    >
      <h2>Who we are</h2>
      <p>
        Pesa is published by {PUBLISHER_NAME}, an individual developer based in {COUNTRY}{" "}
        (&ldquo;we&rdquo;, &ldquo;us&rdquo;). We are the data controller for the personal data
        described here. Contact: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>Pesa doesn&rsquo;t move real money</h2>
      <p>
        Pesa is a planner and record-keeper. It is not a bank, wallet or payment service. It never
        connects to your bank or mobile-money account, and never asks for bank logins, card numbers
        or mobile-money PINs. Amounts, &ldquo;bank accounts&rdquo; and payment methods in Pesa are
        labels and numbers that you type in yourself.
      </p>

      <h2>What we collect</h2>
      <div className="legal-scroll">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Examples</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Account details</td>
              <td>
                Name, email address, password (stored only as a one-way hash). If you sign in with
                Google on the website: the name, email and profile picture Google shares.
              </td>
              <td>To create your account, sign you in and email you sign-in codes and links.</td>
            </tr>
            <tr>
              <td>Budget information you enter</td>
              <td>
                Salary and income sources, pots and their targets, amounts you record as sent or
                spent, notes, the names and balances of accounts you add, projects and milestones,
                currency and payday.
              </td>
              <td>This is the app: showing your plan, totals, insights and monthly wrap.</td>
            </tr>
            <tr>
              <td>Settings</td>
              <td>
                Notification choices, round-ups, payday reminders, and an app-lock PIN (stored only
                as a one-way hash).
              </td>
              <td>To behave the way you asked.</td>
            </tr>
            <tr>
              <td>Device and session data</td>
              <td>
                A push-notification token for your device (if you turn notifications on), the app or
                browser version that signed in, and when each session started.
              </td>
              <td>
                To deliver the notifications you chose, keep you signed in, and let you sign out
                everywhere.
              </td>
            </tr>
            <tr>
              <td>IP address</td>
              <td>The network address your request comes from.</td>
              <td>
                To block password-guessing and email spam (rate limiting). We store only a
                scrambled (hashed) form, for up to a day. Our hosting provider also keeps standard
                server logs for a short period.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        We do <strong>not</strong> collect your location, contacts, photos, microphone or camera
        data, advertising identifiers, or real banking or card credentials. Pesa contains no
        advertising, no analytics or tracking SDKs, and we do not combine your data with data from
        other companies.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>To provide and secure the service (sign-in, app lock, preventing abuse).</li>
        <li>To send the emails the service needs: sign-in codes, magic links, password resets.</li>
        <li>
          To send the push notifications you switch on (payday, bills due, a pot filled, your
          monthly wrap). You can turn each one off in the app.
        </li>
        <li>To answer you when you contact us.</li>
      </ul>
      <p>
        We process your data because it is needed to provide the service you signed up for, and,
        for security measures such as rate limiting, because we have a legitimate interest in
        keeping accounts safe. We never use your financial entries for advertising, profiling or
        credit decisions, and we never sell or rent personal data.
      </p>

      <h2>Who processes it for us</h2>
      <p>We use a small number of service providers, each only for the job listed:</p>
      <ul>
        <li>
          <strong>Vercel</strong> — hosts the website and the app&rsquo;s server.
        </li>
        <li>
          <strong>Neon</strong> — stores the database (servers in the United States).
        </li>
        <li>
          <strong>Resend</strong> — delivers our emails.
        </li>
        <li>
          <strong>Google</strong> — &ldquo;Sign in with Google&rdquo; on the website, and Firebase
          Cloud Messaging, which delivers push notifications to Android and iOS devices.
        </li>
        <li>
          <strong>Apple</strong> — Apple Push Notification service, for notifications on iPhone.
        </li>
      </ul>
      <p>
        These providers may process data outside {COUNTRY}, including in the United States. We rely
        on their contractual data-protection commitments. We disclose data to anyone else only if
        the law requires it.
      </p>

      <h2>Security</h2>
      <p>
        All traffic is encrypted in transit (HTTPS). Passwords, PINs, sign-in codes and session
        tokens are stored only as one-way hashes. Sign-in attempts are rate-limited, and changing
        your password signs out every other session.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Your account and budget data: until you delete your account.</li>
        <li>Sign-in codes and links: expire within minutes and can&rsquo;t be reused.</li>
        <li>Hashed rate-limit records: up to about a day.</li>
        <li>Device push tokens: until you sign out, turn notifications off, or the token expires.</li>
        <li>Hosting-provider server logs: kept for a short period under their own policies.</li>
      </ul>

      <h2>Deleting your account</h2>
      <p>
        You can delete your account and all of its data at any time: in the app, go to{" "}
        <strong>More → Delete my account</strong>; on the website, open{" "}
        <strong>More → Delete my account</strong>. Deletion is immediate and permanent and removes your profile, pots,
        transactions, accounts, projects, sessions and device tokens. If you can&rsquo;t sign in,
        see <Link href="/delete-account">how to request deletion</Link>.
      </p>
      <p>
        Before deleting, you can download a month&rsquo;s transactions as a CSV file from the
        website (More → Export this month).
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live (including under {COUNTRY}&rsquo;s Data Protection Act, 2012
        (Act 843), and the EU/UK GDPR), you may have the right to access, correct, export or delete
        your personal data, and to object to or restrict how it is processed. Most of this you can
        do yourself in the app. For anything else, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>; we&rsquo;ll respond within 30
        days. You can also complain to your local data-protection authority (in {COUNTRY}, the Data
        Protection Commission).
      </p>

      <h2>Children</h2>
      <p>
        Pesa is meant for adults managing their own money and is not directed at children. We
        don&rsquo;t knowingly collect data from anyone under 13 (or the minimum age in their
        country). If you think a child has given us data, email us and we&rsquo;ll delete it.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy, we&rsquo;ll update the date at the top. If a change is
        significant, we&rsquo;ll also let you know in the app or by email before it takes effect.
      </p>
    </LegalPage>
  )
}
