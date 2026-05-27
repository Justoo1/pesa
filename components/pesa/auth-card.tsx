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
              className="tiny"
              style={{
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Pesa
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
