import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { normalizeHost, isIgnoredHost } from "./types";
import type { TenantResolution } from "./types";

/** In-memory cache entry */
interface CacheEntry {
  data: TenantResolution;
  expiry: number;
}

/** Module-level cache — edge-compatible, no external dependencies */
const domainCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000; // 60 seconds

/**
 * Create a Supabase admin client for domain lookups (bypasses RLS).
 * Uses service-role key — same pattern as middleware's getProfileRole().
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
  return createSupabaseClient(url, serviceKey);
}

/**
 * Resolve a tenant by custom domain.
 *
 * Returns { type: 'domain', restaurantId, slug } on match.
 * Returns { type: 'none' } if not found, inactive, or not pro.
 *
 * Security: Only matches restaurants where:
 *  - domain_status = 'active'
 *  - plan = 'pro'
 *  - active = true
 */
export async function resolveTenantByDomain(
  host: string
): Promise<TenantResolution> {
  const normalized = normalizeHost(host);

  // Skip known non-custom hosts
  if (isIgnoredHost(normalized)) {
    return { type: "none" };
  }

  // Check cache
  const cached = domainCache.get(normalized);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  // Query DB
  try {
    const admin = getAdminClient();
    const { data: restaurant, error } = await admin
      .from("restaurants")
      .select("id, slug, custom_domain, domain_status, plan, active")
      .eq("custom_domain", normalized)
      .eq("domain_status", "active")
      .eq("plan", "pro")
      .eq("active", true)
      .single();

    if (error || !restaurant) {
      const miss: TenantResolution = { type: "none" };
      domainCache.set(normalized, { data: miss, expiry: Date.now() + CACHE_TTL_MS });
      return miss;
    }

    const hit: TenantResolution = {
      type: "domain",
      restaurantId: restaurant.id,
      slug: restaurant.slug,
      domain: normalized,
    };
    domainCache.set(normalized, { data: hit, expiry: Date.now() + CACHE_TTL_MS });
    return hit;
  } catch (err) {
    console.error("[domain-resolver] Failed to resolve domain:", err);
    return { type: "none" };
  }
}

/** Clear the domain cache (useful after domain activation/deactivation) */
export function invalidateDomainCache(domain?: string) {
  if (domain) {
    domainCache.delete(normalizeHost(domain));
  } else {
    domainCache.clear();
  }
}
