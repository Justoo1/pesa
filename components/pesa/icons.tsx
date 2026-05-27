import type { IconName } from "./types"

type IconProps = {
  name: IconName
  size?: number
  stroke?: number
}

export function Icon({ name, size = 20, stroke = 1.7 }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }
  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5 10v10h14V10" />
          <path d="M10 20v-5h4v5" />
        </svg>
      )
    case "piggy":
      return (
        <svg {...common}>
          <path d="M3 13c0-4 4-6 8-6s8 2 8 6c0 2-1 3.2-2.5 4.2L17 20h-3l-.5-1h-3L10 20H7l-.5-2.8C5 16.2 3 15 3 13Z" />
          <circle cx="14" cy="11.5" r="1" />
          <path d="M3 11h2" />
          <path d="M9 7c0-1 1-2 2-2" />
        </svg>
      )
    case "heart":
      return (
        <svg {...common}>
          <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z" />
        </svg>
      )
    case "leaf":
      return (
        <svg {...common}>
          <path d="M5 19c0-9 6-14 14-14 0 9-5 14-14 14Z" />
          <path d="M5 19 14 10" />
        </svg>
      )
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 4 6v6c0 5 4 8 8 9 4-1 8-4 8-9V6l-8-3Z" />
        </svg>
      )
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
        </svg>
      )
    case "broom":
      return (
        <svg {...common}>
          <path d="M14 4l6 6" />
          <path d="M4 20s2-6 6-10l4 4c-4 4-10 6-10 6Z" />
        </svg>
      )
    case "wifi":
      return (
        <svg {...common}>
          <path d="M2 8.5C5 6 8.4 4.5 12 4.5s7 1.5 10 4" />
          <path d="M5 12c2-2 4.4-3.2 7-3.2S17 10 19 12" />
          <path d="M8.5 15.5c1-1 2.2-1.6 3.5-1.6s2.5.6 3.5 1.6" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      )
    case "flame":
      return (
        <svg {...common}>
          <path d="M12 3s5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9Z" />
        </svg>
      )
    case "bulb":
      return (
        <svg {...common}>
          <path d="M9 18h6" />
          <path d="M10 21h4" />
          <path d="M8 14a5 5 0 1 1 8 0c-1 1-1.5 2-1.5 3h-5c0-1-.5-2-1.5-3Z" />
        </svg>
      )
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      )
    case "minus":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
        </svg>
      )
    case "back":
      return (
        <svg {...common}>
          <path d="M15 6l-6 6 6 6" />
        </svg>
      )
    case "close":
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      )
    case "check":
      return (
        <svg {...common}>
          <path d="M5 13l4 4 10-10" />
        </svg>
      )
    case "chevron":
      return (
        <svg {...common}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      )
    case "more":
      return (
        <svg {...common}>
          <circle cx="5" cy="12" r="1.4" />
          <circle cx="12" cy="12" r="1.4" />
          <circle cx="19" cy="12" r="1.4" />
        </svg>
      )
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
        </svg>
      )
    case "trend":
      return (
        <svg {...common}>
          <path d="M3 17l6-6 4 4 8-8" />
          <path d="M14 7h7v7" />
        </svg>
      )
    case "wallet":
      return (
        <svg {...common}>
          <path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
          <path d="M3 9h18" />
          <circle cx="16.5" cy="14" r="1" />
        </svg>
      )
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 13.6a8 8 0 0 0 0-3.2l2-1.6-2-3.4-2.4 1A7.5 7.5 0 0 0 14 4.8L13.6 2h-3.2L10 4.8a7.5 7.5 0 0 0-3 1.6l-2.4-1-2 3.4 2 1.6a8 8 0 0 0 0 3.2l-2 1.6 2 3.4 2.4-1c.9.7 1.9 1.3 3 1.6l.4 2.8h3.2l.4-2.8c1.1-.3 2.1-.9 3-1.6l2.4 1 2-3.4-2-1.6Z" />
        </svg>
      )
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 3v4M16 3v4" />
        </svg>
      )
    case "history":
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
          <path d="M12 8v5l3 2" />
        </svg>
      )
    case "edit":
      return (
        <svg {...common}>
          <path d="M4 20h4l10-10-4-4L4 16v4Z" />
          <path d="M13 7l4 4" />
        </svg>
      )
    case "send":
      return (
        <svg {...common}>
          <path d="M22 3 11 14" />
          <path d="M22 3l-7 19-4-8-8-4 19-7Z" />
        </svg>
      )
    case "scan":
      return (
        <svg {...common}>
          <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" />
          <path d="M4 12h16" />
        </svg>
      )
    case "info":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
      )
    case "share":
      return (
        <svg {...common}>
          <path d="M12 3v12M7 8l5-5 5 5" />
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
      )
    case "tag":
      return (
        <svg {...common}>
          <path d="M3 12V4h8l10 10-8 8L3 12Z" />
          <circle cx="8" cy="8" r="1.4" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      )
  }
}
