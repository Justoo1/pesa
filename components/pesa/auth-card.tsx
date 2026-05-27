import type { ReactNode } from "react"

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="stage">
      <div className="scene">
        <div className="scene-copy">
          <div className="scene-tag">
            <span className="dot"></span> Pesa · personal budgeting
          </div>
          <h1>
            Every cedi,
            <br />
            <span className="italic">a place to land.</span>
          </h1>
          <p>
            Payday is a ritual. Move your salary into pots — Rent, Mom, Savings, Tithe — and
            watch each one fill.
          </p>
        </div>

        <div
          className="device"
          style={{
            height: "auto",
            minHeight: 560,
            padding: 28,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 6,
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M6.5 12c0-2.2 1.8-4 4-4h11c2.2 0 4 1.8 4 4v10.5c0 2.5-2 4.5-4.5 4.5h-10c-2.5 0-4.5-2-4.5-4.5z"
                  fill="#C9714B"
                />
                <rect x="5.5" y="7" width="21" height="3.5" rx="1.75" fill="#9F5234" />
                <path
                  d="M8.5 17.5c0-.5.4-1 1-1h13c.6 0 1 .5 1 1v5.5c0 1.4-1.1 2.5-2.5 2.5h-10c-1.4 0-2.5-1.1-2.5-2.5z"
                  fill="#3D5234"
                />
                <ellipse
                  cx="11"
                  cy="14.5"
                  rx="1.1"
                  ry="2.2"
                  fill="#FFFFFF"
                  fillOpacity="0.3"
                />
              </svg>
              <span
                className="serif"
                style={{ fontSize: 24, lineHeight: 1, color: "var(--ink)" }}
              >
                Pesa
              </span>
            </div>
            <div
              className="serif"
              style={{ fontSize: 32, lineHeight: 1.05, marginTop: 4 }}
            >
              {title}
            </div>
            <div className="body" style={{ marginTop: 6 }}>
              {subtitle}
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
