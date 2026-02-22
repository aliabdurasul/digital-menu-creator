"use server";

/**
 * Custom domain management — server actions.
 *
 * These actions manage the custom_domain column on the restaurants table.
 * They enforce feature flag checks (only pro-plan restaurants can use custom domains).
 *
 * Future: integrate with Vercel Domains API for automatic domain provisioning.
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { hasFeatureForPlan } from "@/lib/features/server";
import type { Plan } from "@/lib/features/flags";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createSupabaseClient(url, serviceKey);
}

/**
 * Set a custom domain for a restaurant.
 * Only available for pro-plan restaurants (enforced by feature flag).
 *
 * @param restaurantId - The restaurant's UUID
 * @param domain       - The custom domain (e.g., "menu.kebabhouse.com")
 * @returns DNS configuration instructions on success
 */
export async function setCustomDomain(
  restaurantId: string,
  domain: string
): Promise<ActionResult<{ domain: string; dnsInstructions: string }>> {
  try {
    // Validate auth
    const supabase = createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Kimlik doğrulanamadı" };
    }

    // Get restaurant plan and verify feature access
    const admin = getAdminClient();
    const { data: restaurant, error: rError } = await admin
      .from("restaurants")
      .select("id, plan")
      .eq("id", restaurantId)
      .single();

    if (rError || !restaurant) {
      return { success: false, error: "Restoran bulunamadı" };
    }

    if (!hasFeatureForPlan(restaurant.plan as Plan, "custom_domain")) {
      return {
        success: false,
        error: "Özel alan adı desteği yalnızca Pro plan ile kullanılabilir. Lütfen planınızı yükseltin.",
      };
    }

    // Validate domain format
    const normalizedDomain = domain.trim().toLowerCase();
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
    if (!domainRegex.test(normalizedDomain)) {
      return { success: false, error: "Geçersiz alan adı formatı" };
    }

    // Check domain isn't already taken
    const { data: existing } = await admin
      .from("restaurants")
      .select("id")
      .eq("custom_domain", normalizedDomain)
      .neq("id", restaurantId)
      .single();

    if (existing) {
      return { success: false, error: "Bu alan adı başka bir restoran tarafından kullanılıyor" };
    }

    // Update restaurant's custom domain
    const { error: updateError } = await admin
      .from("restaurants")
      .update({
        custom_domain: normalizedDomain,
        updated_at: new Date().toISOString(),
      })
      .eq("id", restaurantId);

    if (updateError) {
      return { success: false, error: "Alan adı kaydedilemedi: " + updateError.message };
    }

    // TODO: Call Vercel Domains API to register the domain
    // POST https://api.vercel.com/v10/projects/{projectId}/domains
    // For now, return manual DNS instructions

    return {
      success: true,
      data: {
        domain: normalizedDomain,
        dnsInstructions: `DNS ayarlarınızda aşağıdaki CNAME kaydını ekleyin:\n\nAd: ${normalizedDomain}\nTür: CNAME\nDeğer: cname.vercel-dns.com\n\nDNS değişikliklerinin yayılması 24-48 saat sürebilir.`,
      },
    };
  } catch (err) {
    console.error("[actions/setCustomDomain]", err);
    return { success: false, error: "Beklenmeyen bir hata oluştu" };
  }
}

/**
 * Remove a custom domain from a restaurant.
 */
export async function removeCustomDomain(
  restaurantId: string
): Promise<ActionResult> {
  try {
    const supabase = createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Kimlik doğrulanamadı" };
    }

    const admin = getAdminClient();
    const { error: updateError } = await admin
      .from("restaurants")
      .update({
        custom_domain: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", restaurantId);

    if (updateError) {
      return { success: false, error: "Alan adı kaldırılamadı: " + updateError.message };
    }

    // TODO: Call Vercel Domains API to remove the domain
    // DELETE https://api.vercel.com/v10/projects/{projectId}/domains/{domain}

    return { success: true, data: undefined };
  } catch (err) {
    console.error("[actions/removeCustomDomain]", err);
    return { success: false, error: "Beklenmeyen bir hata oluştu" };
  }
}

/**
 * Verify DNS configuration for a custom domain.
 * Checks if the CNAME record is properly configured.
 */
export async function verifyCustomDomainDns(
  restaurantId: string
): Promise<ActionResult<{ verified: boolean; message: string }>> {
  try {
    const admin = getAdminClient();
    const { data: restaurant, error } = await admin
      .from("restaurants")
      .select("custom_domain")
      .eq("id", restaurantId)
      .single();

    if (error || !restaurant?.custom_domain) {
      return { success: false, error: "Özel alan adı bulunamadı" };
    }

    // TODO: Implement actual DNS verification
    // For now, return a pending status
    return {
      success: true,
      data: {
        verified: false,
        message: `DNS doğrulaması henüz tamamlanmadı. ${restaurant.custom_domain} için CNAME kaydını kontrol edin.`,
      },
    };
  } catch (err) {
    console.error("[actions/verifyCustomDomainDns]", err);
    return { success: false, error: "Beklenmeyen bir hata oluştu" };
  }
}
