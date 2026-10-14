#!/usr/bin/env node
// Renders the mobile app's branding PNGs from the web logo (same paths as
// app/icon.svg / app/apple-icon.tsx) into pesa_mobile/assets/branding/:
//
//   node scripts/gen-mobile-branding.cjs
//   cd pesa_mobile && dart run flutter_launcher_icons && dart run flutter_native_splash:create
//
// The native splash deliberately shows an EMPTY pot: the Flutter animated
// splash (lib/features/splash/animated_splash.dart) starts from that exact
// frame and fills it, so the hand-off is seamless.
const path = require("path")
const sharp = require("sharp")

const out = path.join(__dirname, "..", "pesa_mobile", "assets", "branding")

const body = `<path d="M6.5 12c0-2.2 1.8-4 4-4h11c2.2 0 4 1.8 4 4v10.5c0 2.5-2 4.5-4.5 4.5h-10c-2.5 0-4.5-2-4.5-4.5z" fill="#C9714B"/>`
const rim = `<rect x="5.5" y="7" width="21" height="3.5" rx="1.75" fill="#9F5234"/>`
const fill = `<path d="M8.5 17.5c0-.5.4-1 1-1h13c.6 0 1 .5 1 1v5.5c0 1.4-1.1 2.5-2.5 2.5h-10c-1.4 0-2.5-1.1-2.5-2.5z" fill="#3D5234"/>`
const meniscus = `<rect x="9.5" y="16.5" width="14" height="0.8" rx="0.4" fill="#FFFFFF" fill-opacity="0.35"/>`
const shine = `<ellipse cx="11" cy="14.5" rx="1.1" ry="2.2" fill="#FFFFFF" fill-opacity="0.3"/>`

const fullPot = body + rim + fill + meniscus + shine
const emptyPot = body + rim + shine

// The pot's own bounds are x 5.5–26.5, y 7–27: center (16, 17).
function potSvg(canvas, potSize, art, background = "") {
  const scale = potSize / 32
  const tx = canvas / 2 - 16 * scale
  const ty = canvas / 2 - 17 * scale
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}" viewBox="0 0 ${canvas} ${canvas}">
    ${background}<g transform="translate(${tx} ${ty}) scale(${scale})">${art}</g></svg>`
}

const gradient = (c) => `<defs><linearGradient id="g" x1="0" y1="0" x2="0.36" y2="1">
  <stop offset="0" stop-color="#F4EBD9"/><stop offset="0.5" stop-color="#E8DEC8"/>
  <stop offset="1" stop-color="#E5D7B6"/></linearGradient></defs>
  <rect width="${c}" height="${c}" fill="url(#g)"/>`

const jobs = [
  // Full-bleed square icon (iOS + legacy Android), like apple-icon.tsx.
  ["icon.png", potSvg(1024, 680, fullPot, gradient(1024))],
  // Android adaptive-icon foreground: transparent, inside the 66% safe zone.
  ["icon_foreground.png", potSvg(1024, 560, fullPot)],
  // Native splash: transparent EMPTY pot (Android 12 masks to a circle).
  ["splash.png", potSvg(1152, 640, emptyPot)],
]

Promise.all(
  jobs.map(([name, svg]) => sharp(Buffer.from(svg)).png().toFile(path.join(out, name))),
).then((results) =>
  results.forEach((r, i) => console.log(`${jobs[i][0]} ${r.width}x${r.height}`)),
)
