/**
 * Domain Resolver — pure function, no DB calls.
 *
 * Classifies an incoming hostname into one of:
 *   1. "platform"      — main site (lezzet.app, www.lezzet.app, localhost)
 *   2. "subdomain"     — tenant subdomain (kebab.lezzet.app)
 *   3. "custom_domain" — tenant's own domain (menu.kebabhouse.com)
 *
 * The resolver reads NEXT_PUBLIC_APP_URL to determine the primary domain.
 * It never touches the database — this keeps middleware fast.
 */

import type { DomainResolution } from "./types";

/**
 * Extract the base domain from NEXT_PUBLIC_APP_URL or fall back to localhost.
 *
 * Examples:
 *   "https://lezzet.app"        → "lezzet.app"
 *   "http://localhost:3000"     → "localhost"
 *   "https://www.lezzet.app"   → "lezzet.app"
 */
function getPrimaryDomain(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const url = new URL(appUrl);
    // Strip "www." prefix if present
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "localhost";
  }
}

/**
 * Known platform subdomains that should NOT be treated as tenant slugs.
 * Add entries here as you add platform-level subdomains (e.g., api, admin, docs).
 */
const RESERVED_SUBDOMAINS = new Set(["www", "api", "admin", "docs", "app"]);

/**
 * Resolve a hostname into a domain classification.
 *
 * @param hostname - The `Host` header value (e.g., "kebab.lezzet.app", "localhost:3000")
 * @returns A discriminated union describing how to route this request.
 *
 * @example
 *   resolveDomain("lezzet.app")          // { type: "platform", slug: null }
 *   resolveDomain("kebab.lezzet.app")    // { type: "subdomain", slug: "kebab" }
 *   resolveDomain("menu.kebabhouse.com") // { type: "custom_domain", domain: "menu.kebabhouse.com" }
 */
export function resolveDomain(hostname: string): DomainResolution {
  // Strip port number if present (e.g., "localhost:3000" → "localhost")
  const host = hostname.split(":")[0].toLowerCase();
  const primaryDomain = getPrimaryDomain();

  // ── Case 1: Exact match with primary domain (with or without www) ──
  if (host === primaryDomain || host === `www.${primaryDomain}`) {
    return { type: "platform", slug: null };
  }

  // ── Case 2: Subdomain of primary domain ──
  // e.g., "kebab.lezzet.app" when primaryDomain is "lezzet.app"
  if (host.endsWith(`.${primaryDomain}`)) {
    const subdomain = host.slice(0, -(primaryDomain.length + 1)); // "kebab"

    // Skip reserved subdomains
    if (RESERVED_SUBDOMAINS.has(subdomain) || !subdomain) {
      return { type: "platform", slug: null };
    }

    // Reject multi-level subdomains (e.g., "a.b.lezzet.app")
    if (subdomain.includes(".")) {
      return { type: "platform", slug: null };
    }

    return { type: "subdomain", slug: subdomain };
  }

  // ── Case 3: Localhost development ──
  // Support "kebab.localhost" for local subdomain testing
  if (primaryDomain === "localhost") {
    if (host === "localhost") {
      return { type: "platform", slug: null };
    }
    if (host.endsWith(".localhost")) {
      const subdomain = host.slice(0, -".localhost".length);
      if (subdomain && !subdomain.includes(".") && !RESERVED_SUBDOMAINS.has(subdomain)) {
        return { type: "subdomain", slug: subdomain };
      }
    }
    return { type: "platform", slug: null };
  }

  // ── Case 4: Vercel preview deploys ──
  // Vercel preview URLs like *.vercel.app should be treated as platform
  if (host.endsWith(".vercel.app")) {
    return { type: "platform", slug: null };
  }

  // ── Case 5: Custom domain ──
  // Any hostname that doesn't match the above is a custom domain
  return { type: "custom_domain", domain: host };
}
