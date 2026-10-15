// Single source for the details shown on the public legal pages (/privacy,
// /terms, /support, /delete-account) and quoted in docs/store/*. Change them
// here, then re-check the store listings.

/**
 * The person publishing Pesa (data controller). Must match the Play / App
 * Store developer name; `npm run check:release` fails while it's a placeholder.
 */
export const PUBLISHER_NAME = "Justice Amankrah"

export const CONTACT_EMAIL = "amankrahjay@gmail.com"
export const SITE_URL = "https://pesa.edtmsys.com"
export const COUNTRY = "Ghana"

/** Bump when the policy or terms change materially (and tell users in-app). */
export const POLICY_EFFECTIVE_DATE = "15 October 2026"
