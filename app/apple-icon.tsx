import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(160deg, #F4EBD9 0%, #E8DEC8 50%, #E5D7B6 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
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
          <rect
            x="9.5"
            y="16.5"
            width="14"
            height="0.8"
            rx="0.4"
            fill="#FFFFFF"
            fill-opacity="0.35"
          />
          <ellipse
            cx="11"
            cy="14.5"
            rx="1.1"
            ry="2.2"
            fill="#FFFFFF"
            fill-opacity="0.3"
          />
        </svg>
      </div>
    ),
    { ...size },
  )
}
