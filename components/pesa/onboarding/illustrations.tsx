// Hand-stroked SVG figures in the same drawing grammar as components/pesa/icons.tsx:
// 1.7 px strokes, round caps and joins, currentColor accents, no fills on the figure.
// Soft tinted blobs anchor each figure to the brand palette.

const COMMON = {
  width: "100%",
  height: "100%",
  viewBox: "0 0 240 200",
  preserveAspectRatio: "xMidYMid meet",
  fill: "none" as const,
}

const STROKE = {
  stroke: "var(--ink)",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
} as const

function Figure({
  x,
  armRight,
}: {
  x: number
  /** Right-arm pose. "wave" raises it; "down" keeps it at the side; "pour" extends it forward holding the pot. */
  armRight: "wave" | "down" | "pour" | "point"
}) {
  // Body geometry: head circle, trapezoid torso, two legs.
  const headY = 78
  const bodyTop = 96
  const bodyBot = 140
  return (
    <g {...STROKE}>
      {/* head */}
      <circle cx={x} cy={headY} r={11} />
      {/* hair tuft */}
      <path d={`M${x - 7} ${headY - 8} q4 -6 14 0`} />
      {/* torso */}
      <path
        d={`M${x - 9} ${bodyTop} L${x + 9} ${bodyTop} L${x + 12} ${bodyBot} L${x - 12} ${bodyBot} Z`}
      />
      {/* left arm — always at side */}
      <path d={`M${x - 9} ${bodyTop + 4} L${x - 18} ${bodyTop + 24}`} />
      {/* right arm */}
      {armRight === "wave" && (
        <>
          <path d={`M${x + 9} ${bodyTop + 4} L${x + 22} ${bodyTop - 18}`} />
          {/* tiny motion dashes */}
          <path d={`M${x + 26} ${bodyTop - 24} l3 -3`} />
          <path d={`M${x + 30} ${bodyTop - 18} l3 -1`} />
        </>
      )}
      {armRight === "down" && (
        <path d={`M${x + 9} ${bodyTop + 4} L${x + 18} ${bodyTop + 24}`} />
      )}
      {armRight === "pour" && (
        <path d={`M${x + 9} ${bodyTop + 6} L${x + 28} ${bodyTop + 14}`} />
      )}
      {armRight === "point" && (
        <path d={`M${x + 9} ${bodyTop + 4} L${x + 26} ${bodyTop + 2}`} />
      )}
      {/* legs */}
      <path d={`M${x - 6} ${bodyBot} L${x - 9} ${bodyBot + 22}`} />
      <path d={`M${x + 6} ${bodyBot} L${x + 9} ${bodyBot + 22}`} />
    </g>
  )
}

function Pot({
  cx,
  cy,
  scale = 1,
  fillVar = "var(--green-soft)",
  label,
}: {
  cx: number
  cy: number
  scale?: number
  fillVar?: string
  label?: string
}) {
  const w = 28 * scale
  const h = 26 * scale
  const lipH = 4 * scale
  return (
    <g>
      {/* clay body */}
      <path
        d={`M${cx - w / 2} ${cy - h / 2 + lipH}
            Q${cx - w / 2 - 2} ${cy} ${cx - w / 2 + 2} ${cy + h / 2}
            L${cx + w / 2 - 2} ${cy + h / 2}
            Q${cx + w / 2 + 2} ${cy} ${cx + w / 2} ${cy - h / 2 + lipH}
            Z`}
        fill="var(--clay-soft)"
        {...STROKE}
      />
      {/* lip */}
      <path
        d={`M${cx - w / 2 - 2} ${cy - h / 2 + lipH}
            L${cx + w / 2 + 2} ${cy - h / 2 + lipH}`}
        {...STROKE}
      />
      <ellipse
        cx={cx}
        cy={cy - h / 2 + lipH}
        rx={w / 2 + 2}
        ry={lipH / 2 + 1}
        fill="var(--clay)"
        {...STROKE}
      />
      {/* contents fill (about 60%) */}
      <path
        d={`M${cx - w / 2 + 3} ${cy + h / 4}
            L${cx + w / 2 - 3} ${cy + h / 4}
            L${cx + w / 2 - 2} ${cy + h / 2 - 1}
            L${cx - w / 2 + 2} ${cy + h / 2 - 1}
            Z`}
        fill={fillVar}
      />
      {label && (
        <text
          x={cx}
          y={cy + h / 2 + 12 * scale}
          textAnchor="middle"
          fontSize={9 * scale}
          fontFamily="var(--sans)"
          fill="var(--ink-2)"
        >
          {label}
        </text>
      )}
    </g>
  )
}

function Blob({
  color,
  d,
  opacity = 0.55,
}: {
  color: string
  d: string
  opacity?: number
}) {
  return <path d={d} fill={color} opacity={opacity} />
}

export function WelcomeFigure() {
  return (
    <svg {...COMMON} aria-hidden="true">
      <Blob
        color="var(--green-tint)"
        d="M40 120 Q20 60 90 50 Q180 30 210 110 Q230 180 130 175 Q40 180 40 120 Z"
      />
      <Figure x={100} armRight="wave" />
      <Pot cx={158} cy={150} />
      {/* ground line */}
      <path
        d="M50 180 L200 180"
        stroke="var(--ink-3)"
        strokeWidth={1}
        strokeDasharray="2 4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function PotsFigure() {
  return (
    <svg {...COMMON} aria-hidden="true">
      <Blob
        color="var(--clay-soft)"
        d="M30 140 Q10 80 80 60 Q170 40 215 100 Q235 165 140 175 Q40 185 30 140 Z"
        opacity={0.5}
      />
      <Figure x={60} armRight="point" />
      <Pot cx={120} cy={150} scale={0.85} fillVar="var(--green-soft)" label="Rent" />
      <Pot cx={160} cy={152} scale={0.9} fillVar="var(--gold)" label="Mom" />
      <Pot cx={200} cy={150} scale={0.85} fillVar="var(--rose)" label="Save" />
      <path
        d="M40 180 L220 180"
        stroke="var(--ink-3)"
        strokeWidth={1}
        strokeDasharray="2 4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function RitualFigure() {
  return (
    <svg {...COMMON} aria-hidden="true">
      <Blob
        color="var(--gold)"
        d="M40 130 Q25 70 100 55 Q190 40 215 115 Q230 175 130 175 Q40 180 40 130 Z"
        opacity={0.28}
      />
      <Figure x={70} armRight="pour" />
      {/* Big pot held forward */}
      <g transform="translate(108 102) rotate(35)">
        <Pot cx={0} cy={0} scale={1.1} fillVar="var(--green)" />
      </g>
      {/* Pour stream — three short stroke pieces */}
      <g {...STROKE} stroke="var(--green-deep)">
        <path d="M130 118 q4 8 8 14" />
        <path d="M138 130 q3 6 6 10" />
      </g>
      {/* Two receiving pots */}
      <Pot cx={158} cy={160} scale={0.7} fillVar="var(--green-soft)" />
      <Pot cx={195} cy={160} scale={0.7} fillVar="var(--rose)" />
      <path
        d="M50 180 L215 180"
        stroke="var(--ink-3)"
        strokeWidth={1}
        strokeDasharray="2 4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function TrackFigure() {
  return (
    <svg {...COMMON} aria-hidden="true">
      <Blob
        color="var(--green-tint)"
        d="M35 130 Q15 65 95 55 Q190 40 215 110 Q235 175 130 175 Q40 185 35 130 Z"
      />
      <Figure x={70} armRight="point" />
      {/* Chart card */}
      <g>
        <rect
          x={118}
          y={88}
          width={86}
          height={64}
          rx={10}
          fill="var(--bg-card)"
          {...STROKE}
        />
        {/* bars */}
        <rect x={128} y={128} width={10} height={18} rx={2} fill="var(--clay-soft)" />
        <rect x={144} y={118} width={10} height={28} rx={2} fill="var(--gold)" opacity={0.85} />
        <rect x={160} y={108} width={10} height={38} rx={2} fill="var(--green)" />
        <rect x={176} y={120} width={10} height={26} rx={2} fill="var(--rose)" opacity={0.8} />
        {/* axis */}
        <path
          d="M124 148 L200 148"
          stroke="var(--ink-3)"
          strokeWidth={1}
          strokeLinecap="round"
        />
        {/* tiny rising trend line */}
        <path
          d="M124 102 q14 -6 26 4 q14 10 28 -6"
          {...STROKE}
          stroke="var(--green-deep)"
        />
      </g>
      <path
        d="M50 180 L215 180"
        stroke="var(--ink-3)"
        strokeWidth={1}
        strokeDasharray="2 4"
        strokeLinecap="round"
      />
    </svg>
  )
}
