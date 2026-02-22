/**
 * Tenant Context — server-side helper that fetches the restaurant
 * after the domain resolver classifies the hostname.
 *
 * Used in Server Components (not in middleware) to avoid DB calls
 * on every request including static assets.
 */

import { createClient } from "@/lib/supabase/server";
import type { TenantContext, TenantResolvedVia } from "./types";

/**
 * Resolve a tenant by slug (subdomain routing).
 */
export async function getTenantBySlug(
  slug: string
): Promise<TenantContext | null> {
  return resolveTenant("slug", slug);
}

/**
 * Resolve a tenant by subdomain slug.
 */
export async function getTenantBySubdomain(
  slug: string
): Promise<TenantContext | null> {
  return resolveTenant("subdomain", slug);
}

/**
 * Resolve a tenant by custom domain.
 */
export async function getTenantByDomain(
  domain: string
): Promise<TenantContext | null> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("restaurants")
      .select("id, slug, plan, custom_domain")
      .eq("custom_domain", domain)
      .eq("active", true)
      .single();

    if (error || !data) return null;

    return {
      restaurantId: data.id,
      slug: data.slug,
      plan: data.plan as "basic" | "pro",
      resolvedVia: "custom_domain",
      customDomain: data.custom_domain,
    };
  } catch {
    return null;
  }
}

/**
 * Internal: resolve tenant by slug column (used for both path-slug and subdomain).
 */
async function resolveTenant(
  via: TenantResolvedVia,
  slug: string
): Promise<TenantContext | null> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("restaurants")
      .select("id, slug, plan")
      .eq("slug", slug)
      .eq("active", true)
      .single();

    if (error || !data) return null;

    return {
      restaurantId: data.id,
      slug: data.slug,
      plan: data.plan as "basic" | "pro",
      resolvedVia: via,
    };
  } catch {
    return null;
  }
}

/**
 * Read tenant info from request headers (set by middleware).
 * For use in Server Components inside the (tenant) route group.
 */
export async function getTenantFromHeaders(): Promise<TenantContext | null> {
  // Dynamic import to avoid pulling in next/headers in non-server contexts
  const { headers } = await import("next/headers");
  const headerStore = headers();

  const resolvedVia = headerStore.get("x-tenant-resolved-via") as TenantResolvedVia | null;
  if (!resolvedVia) return null;

  if (resolvedVia === "subdomain") {
    const slug = headerStore.get("x-tenant-slug");
    if (!slug) return null;
    return getTenantBySubdomain(slug);
  }

  if (resolvedVia === "custom_domain") {
    const domain = headerStore.get("x-tenant-domain");
    if (!domain) return null;
    return getTenantByDomain(domain);
  }

  return null;
}
