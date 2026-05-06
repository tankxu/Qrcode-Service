// Production scans go through the short host q.pandaqr.xyz/<slug>.
// Local dev (wrangler dev / vite preview) keeps same-origin /q/<slug>
// so the same Worker handler renders without DNS gymnastics.
const PROD_APP_HOST = "app.pandaqr.xyz";
const SHORT_BASE = "https://q.pandaqr.xyz";

export function buildQrUrl(slug: string): string {
  if (typeof window === "undefined") return `${SHORT_BASE}/${slug}`;
  if (window.location.hostname === PROD_APP_HOST) return `${SHORT_BASE}/${slug}`;
  return `${window.location.origin}/q/${slug}`;
}

export function buildQrUrlDisplay(slug: string): string {
  if (typeof window === "undefined") return `q.pandaqr.xyz/${slug}`;
  if (window.location.hostname === PROD_APP_HOST) return `q.pandaqr.xyz/${slug}`;
  return `/q/${slug}`;
}
