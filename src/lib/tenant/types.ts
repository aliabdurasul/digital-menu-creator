/**
 * Tenant resolution types.
 *
 * The domain resolver classifies every incoming request into one of three
 * categories: platform (main site), subdomain tenant, or custom-domain tenant.
 * These types flow from middleware → headers → server components.
 */

/* ─── Domain Resolver Output ─── */

export type DomainResolution =
  | { type: "platform"; slug: null }
  | { type: "subdomain"; slug: string }
  | { type: "custom_domain"; domain: string };

/* ─── Tenant Context (after DB lookup) ─── */

export type TenantResolvedVia = "subdomain" | "custom_domain" | "slug";

export interface TenantContext {
  /** The resolved restaurant (UI-compatible format) */
  restaurantId: string;
  slug: string;
  plan: "basic" | "pro";
  /** How this tenant was resolved */
  resolvedVia: TenantResolvedVia;
  /** The custom domain if resolved via custom_domain */
  customDomain?: string;
}

/* ─── Middleware Headers ─── */

/**
 * Header names set by middleware for downstream server components.
 * Using x-prefixed custom headers that Next.js passes through.
 */
export const TENANT_HEADERS = {
  /** Set when tenant is resolved via subdomain (value = slug) */
  SLUG: "x-tenant-slug",
  /** Set when tenant is resolved via custom domain (value = domain) */
  DOMAIN: "x-tenant-domain",
  /** Always set when tenant is resolved (value = "subdomain" | "custom_domain") */
  RESOLVED_VIA: "x-tenant-resolved-via",
} as const;
