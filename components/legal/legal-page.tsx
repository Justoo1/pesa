import Link from "next/link"
import type { ReactNode } from "react"
import { CONTACT_EMAIL, POLICY_EFFECTIVE_DATE } from "@/lib/legal"

const links = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/support", label: "Support" },
  { href: "/delete-account", label: "Delete account" },
]

/** Plain, public, readable-without-JS layout shared by the legal pages. */
export function LegalPage({
  title,
  intro,
  showEffectiveDate = true,
  children,
}: {
  title: string
  intro?: ReactNode
  showEffectiveDate?: boolean
  children: ReactNode
}) {
  return (
    <main className="legal">
      <header className="legal-head">
        <Link href="/" className="legal-brand">
          Pesa
        </Link>
        <nav aria-label="Legal">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      <h1 className="serif">{title}</h1>
      {showEffectiveDate && <p className="tiny">Effective {POLICY_EFFECTIVE_DATE}</p>}
      {intro && <div className="legal-intro">{intro}</div>}
      {children}
      <footer className="tiny legal-foot">
        Questions? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </footer>
    </main>
  )
}
