import type { MetadataRoute } from "next"

type ShareTargetManifest = MetadataRoute.Manifest & {
  share_target?: {
    action: string
    method: "GET" | "POST"
    enctype?: string
    params: { title?: string; text?: string; url?: string }
  }
}

export default function manifest(): ShareTargetManifest {
  return {
    name: "Pesa — Personal Budgeting",
    short_name: "Pesa",
    description: "Every cedi, a place to land.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4EBD9",
    theme_color: "#C9714B",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    // Receive shared text (SMS receipts, copied transaction blurbs) and route
    // it into a "Log a spend" landing — see app/share/page.tsx.
    share_target: {
      action: "/share",
      method: "GET",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
  }
}
