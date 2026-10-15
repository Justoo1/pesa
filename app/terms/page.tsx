import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage } from "@/components/legal/legal-page"
import { CONTACT_EMAIL, COUNTRY, PUBLISHER_NAME } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Terms of Use — Pesa",
  description: "The terms for using the Pesa budgeting app and website.",
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      intro={
        <p>
          These terms apply when you use the Pesa app or website. By creating an account you agree
          to them. If you don&rsquo;t agree, please don&rsquo;t use Pesa.
        </p>
      }
    >
      <h2>The service</h2>
      <p>
        Pesa, published by {PUBLISHER_NAME}, helps you plan and record how you divide your income
        into pots. Pesa is a planning and record-keeping tool only. It is <strong>not</strong> a
        bank, wallet, payment or mobile-money service: it never holds, sends or receives real money
        and never connects to your financial accounts. When Pesa says money was &ldquo;sent&rdquo;
        or &ldquo;landed&rdquo;, that is a record you made, not a payment.
      </p>

      <h2>Not financial advice</h2>
      <p>
        Insights, health scores, projections and suggestions in Pesa are estimates based on the
        numbers you enter. They are general information, not financial, tax or investment advice.
        Decisions about your money are yours.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Give accurate sign-up details and keep your password and app-lock PIN private.</li>
        <li>You&rsquo;re responsible for what happens under your account.</li>
        <li>
          You must be old enough to agree to these terms where you live (and at least 13). Pesa is
          meant for adults managing their own money.
        </li>
      </ul>

      <h2>Acceptable use</h2>
      <p>
        Don&rsquo;t misuse Pesa: no attempts to break in to other accounts or our systems, overload
        or disrupt the service, reverse-engineer it to attack it, or use it for anything unlawful.
        We may suspend accounts that do.
      </p>

      <h2>Your data</h2>
      <p>
        Your budget data is yours. We use it only to run the service, as described in the{" "}
        <Link href="/privacy">Privacy Policy</Link>. You can delete your account at any time from
        More → Delete my account.
      </p>

      <h2>Availability and changes</h2>
      <p>
        Pesa is provided free of charge, &ldquo;as is&rdquo;. We work to keep it available and
        your data safe, but we can&rsquo;t promise it will always be uninterrupted or error-free,
        and features may change. We&rsquo;ll give reasonable notice before shutting the service
        down, so you can export your data.
      </p>

      <h2>Liability</h2>
      <p>
        To the extent the law allows, we aren&rsquo;t liable for indirect or consequential losses,
        or for decisions you make based on what Pesa shows. Nothing in these terms limits rights
        you have under consumer law that can&rsquo;t be limited.
      </p>

      <h2>Ending</h2>
      <p>
        You can stop using Pesa and delete your account at any time. We may end or suspend access
        if these terms are seriously broken.
      </p>

      <h2>Law and changes to these terms</h2>
      <p>
        These terms are governed by the laws of {COUNTRY}. If we change them materially,
        we&rsquo;ll update the date above and tell you in the app or by email; continuing to use
        Pesa after that means you accept the new terms.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </LegalPage>
  )
}
