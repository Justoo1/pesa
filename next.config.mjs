const isDev = process.env.NODE_ENV !== "production"

// Content-Security-Policy. Next.js bootstraps with inline scripts (no nonce
// pipeline here), so scripts allow 'unsafe-inline'; dev also needs 'unsafe-eval'
// for React Refresh. Everything else is locked to this origin, plus Google
// profile images and the Google OAuth redirect for "Sign in with Google".
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "object-src 'none'",
].join("; ")

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Belt and braces for browsers without frame-ancestors (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Browsers ignore HSTS over plain http, so this is harmless in dev.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Reset links carry a secret token in the URL: never send it as a Referer.
      { source: "/reset-password/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
    ]
  },
}

export default nextConfig
