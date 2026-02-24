"use server";

import { createClient } from "@/lib/supabase/server";
import { invalidateDomainCache } from "@/lib/tenant";
import { checkFeatureServer } from "@/lib/features";

/* ─────────────────────── Domain CRUD ─────────────────────── */

/**
 * Set (or update) the custom domain for a restaurant.
 * Requires pro plan. Sets domain_status to 'pending'.
 */
export async function setCustomDomain(
  restaurantId: string,
  domain: string
): Promise<{ ok: boolean; error?: string }> {
  const allowed = await checkFeatureServer(restaurantId, "custom_domain");
  if (!allowed) return { ok: false, error: "Bu özellik Pro plana aittir." };

  const normalized = domain.toLowerCase().trim();
  if (!normalized || normalized.includes(" ")) {
    return { ok: false, error: "Geçersiz alan adı." };
  }

  const supabase = createClient();

  // Check uniqueness
  const { data: existing } = await supabase
    .from("restaurants")
    .select("id")
    .eq("custom_domain", normalized)
    .neq("id", restaurantId)
    .maybeSingle();

  if (existing) {
    return { ok: false, error: "Bu alan adı başka bir restoran tarafından kullanılıyor." };
  }

  const { error } = await supabase
    .from("restaurants")
    .update({ custom_domain: normalized, domain_status: "pending" })
    .eq("id", restaurantId);

  if (error) return { ok: false, error: error.message };

  invalidateDomainCache(normalized);
  return { ok: true };
}

/**
 * Remove the custom domain from a restaurant.
 */
export async function removeCustomDomain(
  restaurantId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();

  // Get current domain first for cache invalidation
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("custom_domain")
    .eq("id", restaurantId)
    .single();

  const { error } = await supabase
    .from("restaurants")
    .update({ custom_domain: null, domain_status: "pending" })
    .eq("id", restaurantId);

  if (error) return { ok: false, error: error.message };

  if (restaurant?.custom_domain) {
    invalidateDomainCache(restaurant.custom_domain);
  }
  return { ok: true };
}

/* ─────────────────────── DNS Verification ─────────────────── */

/**
 * Verify DNS records for a custom domain using Google DNS-over-HTTPS.
 * Checks that the domain has a CNAME pointing to our app hostname.
 */
export async function verifyDomainDns(
  restaurantId: string
): Promise<{ ok: boolean; verified: boolean; error?: string }> {
  const supabase = createClient();

  const { data: restaurant, error: fetchErr } = await supabase
    .from("restaurants")
    .select("custom_domain, domain_status")
    .eq("id", restaurantId)
    .single();

  if (fetchErr || !restaurant?.custom_domain) {
    return { ok: false, verified: false, error: "Restoran veya alan adı bulunamadı." };
  }

  const domain = restaurant.custom_domain;
  const appHost = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
    : "lezzet-i-ala.vercel.app";

  try {
    const dnsRes = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=CNAME`,
      { next: { revalidate: 0 } }
    );
    const dnsData = await dnsRes.json();

    const answers = dnsData.Answer || [];
    const cnameMatch = answers.some(
      (a: { type: number; data: string }) =>
        a.type === 5 && a.data.replace(/\.$/, "").toLowerCase() === appHost.toLowerCase()
    );

    if (cnameMatch) {
      await supabase
        .from("restaurants")
        .update({ domain_status: "dns_verified" })
        .eq("id", restaurantId);

      return { ok: true, verified: true };
    }

    return { ok: true, verified: false, error: `CNAME ${appHost} bulunamadı.` };
  } catch (err) {
    return { ok: false, verified: false, error: "DNS sorgusu başarısız oldu." };
  }
}

/* ─────────────────────── Status Transitions (Super Admin) ── */

/**
 * Activate a verified domain (super admin only).
 */
export async function activateDomain(
  restaurantId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("custom_domain, domain_status")
    .eq("id", restaurantId)
    .single();

  if (!restaurant?.custom_domain) {
    return { ok: false, error: "Alan adı bulunamadı." };
  }

  if (restaurant.domain_status !== "dns_verified") {
    return { ok: false, error: "Alan adı DNS doğrulamasını geçmedi." };
  }

  const { error } = await supabase
    .from("restaurants")
    .update({ domain_status: "active" })
    .eq("id", restaurantId);

  if (error) return { ok: false, error: error.message };

  invalidateDomainCache(restaurant.custom_domain);
  return { ok: true };
}

/**
 * Reject a domain request (super admin only).
 */
export async function rejectDomain(
  restaurantId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("custom_domain")
    .eq("id", restaurantId)
    .single();

  const { error } = await supabase
    .from("restaurants")
    .update({ domain_status: "rejected" })
    .eq("id", restaurantId);

  if (error) return { ok: false, error: error.message };

  if (restaurant?.custom_domain) {
    invalidateDomainCache(restaurant.custom_domain);
  }
  return { ok: true };
}
