/** Result of resolving a tenant from incoming request */
export interface TenantResolution {
  type: "domain" | "slug" | "none";
  restaurantId?: string;
  slug?: string;
  domain?: string;
}

/** Hosts that should never trigger domain resolution */
export const IGNORED_HOST_PATTERNS = [
  /^localhost(:\d+)?$/,
  /\.vercel\.app$/,
  /\.vercel\.sh$/,
  /^127\.0\.0\.1(:\d+)?$/,
];

/**
 * Get the app's own hostname from NEXT_PUBLIC_APP_URL.
 * Custom domain resolution is skipped for this host.
 */
export function getAppHostname(): string | null {
  try {
    const url = process.env.NEXT_PUBLIC_APP_URL;
    if (!url) return null;
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** Normalize a hostname: lowercase, strip www., strip port */
export function normalizeHost(host: string): string {
  return host
    .toLowerCase()
    .replace(/:\d+$/, "")     // strip port
    .replace(/^www\./, "");    // strip www.
}

/** Check if a host should be ignored (not treated as custom domain) */
export function isIgnoredHost(host: string): boolean {
  const normalized = normalizeHost(host);
  const appHostname = getAppHostname();

  if (appHostname && normalized === normalizeHost(appHostname)) return true;

  return IGNORED_HOST_PATTERNS.some((pattern) => pattern.test(normalized));
}
