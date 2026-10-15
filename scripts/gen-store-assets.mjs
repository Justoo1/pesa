#!/usr/bin/env node
// Renders the store-listing graphics into docs/store/assets/:
//
//   node scripts/gen-store-assets.mjs
//
//   play-icon-512.png             Google Play app icon (512x512, 32-bit PNG)
//   app-store-icon-1024.png       App Store icon (1024x1024, no transparency)
//   play-feature-graphic.png      Google Play feature graphic (1024x500)
//
// Same pot artwork and palette as scripts/gen-mobile-branding.mjs; the
// wordmark uses the bundled Instrument Serif so it matches the app.
import { mkdirSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"
import sharp from "sharp"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const out = path.join(root, "docs", "store", "assets")
mkdirSync(out, { recursive: true })
const serif = path.join(root, "pesa_mobile", "assets", "google_fonts", "InstrumentSerif-Regular.ttf")
const serifItalic = path.join(root, "pesa_mobile", "assets", "google_fonts", "InstrumentSerif-Italic.ttf")
const appIcon = path.join(root, "pesa_mobile", "assets", "branding", "icon.png")

const body = `<path d="M6.5 12c0-2.2 1.8-4 4-4h11c2.2 0 4 1.8 4 4v10.5c0 2.5-2 4.5-4.5 4.5h-10c-2.5 0-4.5-2-4.5-4.5z" fill="#C9714B"/>`
const rim = `<rect x="5.5" y="7" width="21" height="3.5" rx="1.75" fill="#9F5234"/>`
const fill = `<path d="M8.5 17.5c0-.5.4-1 1-1h13c.6 0 1 .5 1 1v5.5c0 1.4-1.1 2.5-2.5 2.5h-10c-1.4 0-2.5-1.1-2.5-2.5z" fill="#3D5234"/>`
const meniscus = `<rect x="9.5" y="16.5" width="14" height="0.8" rx="0.4" fill="#FFFFFF" fill-opacity="0.35"/>`
const shine = `<ellipse cx="11" cy="14.5" rx="1.1" ry="2.2" fill="#FFFFFF" fill-opacity="0.3"/>`
const pot = body + rim + fill + meniscus + shine

// Pango markup text rendered with a specific font file.
const text = (markup, fontfile, font, dpi) =>
  sharp({ text: { text: markup, fontfile, font, rgba: true, dpi } })
    .png()
    .toBuffer()

async function featureGraphic() {
  const W = 1024
  const H = 500
  // Pot at the left, centered vertically; the pot art is 32 units with its
  // body centered at (16, 17).
  const potSize = 330
  const scale = potSize / 32
  const potX = 210
  const tx = potX - 16 * scale
  const ty = H / 2 - 17 * scale
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#F4EBD9"/><stop offset="0.6" stop-color="#E8DEC8"/>
        <stop offset="1" stop-color="#E5D7B6"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <circle cx="${potX}" cy="${H / 2}" r="205" fill="none" stroke="#3D5234" stroke-opacity="0.08" stroke-width="2"/>
    <circle cx="${potX}" cy="${H / 2}" r="245" fill="none" stroke="#3D5234" stroke-opacity="0.05" stroke-width="2"/>
    <g transform="translate(${tx} ${ty}) scale(${scale})">${pot}</g>
  </svg>`

  const word = await text(`<span foreground="#211A12">Pesa</span>`, serif, "Instrument Serif", 820)
  const tag = await text(
    `<span foreground="#3D5234">Every cedi, a place to land.</span>`,
    serifItalic,
    "Instrument Serif Italic",
    300,
  )
  const sub = await text(
    `<span foreground="#4A3F31">Plan your salary into pots.</span>`,
    serif,
    "Instrument Serif",
    210,
  )
  const [wm, tm, sm] = await Promise.all([word, tag, sub].map((b) => sharp(b).metadata()))

  // Stack wordmark / tagline / subline, centered vertically as a block.
  const gap = 6
  const blockH = wm.height + gap + tm.height + gap + sm.height
  const top = Math.round((H - blockH) / 2)
  const left = 440
  return sharp(Buffer.from(svg))
    .composite([
      { input: word, left, top },
      { input: tag, left: left + 4, top: top + wm.height + gap },
      { input: sub, left: left + 6, top: top + wm.height + gap + tm.height + gap },
    ])
    .flatten({ background: "#F4EBD9" })
    .png()
    .toFile(path.join(out, "play-feature-graphic.png"))
}

const results = await Promise.all([
  sharp(appIcon).resize(512, 512).png().toFile(path.join(out, "play-icon-512.png")),
  sharp(appIcon)
    .resize(1024, 1024)
    .flatten({ background: "#F4EBD9" })
    .removeAlpha()
    .png()
    .toFile(path.join(out, "app-store-icon-1024.png")),
  featureGraphic(),
])
for (const [name, r] of [
  ["play-icon-512.png", results[0]],
  ["app-store-icon-1024.png", results[1]],
  ["play-feature-graphic.png", results[2]],
])
  console.log(`${name} ${r.width}x${r.height} (${r.channels} channels)`)
