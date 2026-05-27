import type { Metadata, Viewport } from "next"
import { Geist, JetBrains_Mono, Instrument_Serif } from "next/font/google"

import { SwRegister } from "@/components/sw-register"

import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif",
})

export const metadata: Metadata = {
  title: "Pesa — Personal Budgeting",
  description: "Every cedi, a place to land.",
  applicationName: "Pesa",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Pesa",
    statusBarStyle: "default",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  userScalable: false,
  themeColor: "#C9714B",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable}`}
    >
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  )
}
