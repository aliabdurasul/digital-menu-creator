import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getRestaurantBySlug } from "@/lib/db";
import { getTenantByDomain } from "@/lib/tenant/tenant-context";
import { MenuShell } from "@/components/menu/MenuShell";
import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";

/** ISR: regenerate every 60 seconds */
export const revalidate = 60;

/**
 * Resolve the restaurant for this tenant route.
 * Reads tenant headers set by middleware to determine slug or custom domain.
 */
async function resolveRestaurant() {
  const headerStore = headers();
  const resolvedVia = headerStore.get("x-tenant-resolved-via");

  if (resolvedVia === "subdomain") {
    const slug = headerStore.get("x-tenant-slug");
    if (!slug) return null;
    return getRestaurantBySlug(slug);
  }

  if (resolvedVia === "custom_domain") {
    const domain = headerStore.get("x-tenant-domain");
    if (!domain) return null;
    // First resolve tenant to get the slug, then fetch full restaurant data
    const tenant = await getTenantByDomain(domain);
    if (!tenant) return null;
    return getRestaurantBySlug(tenant.slug);
  }

  return null;
}

/** Dynamic SEO metadata for tenant route */
export async function generateMetadata(): Promise<Metadata> {
  const restaurant = await resolveRestaurant();
  if (!restaurant) {
    return { title: "Menü Bulunamadı" };
  }
  return {
    title: `${restaurant.name} — Lezzet-i Âlâ`,
    description: `${restaurant.name} dijital menüsünü görüntüleyin. Kategorilere göz atın, fiyatları görün.`,
    openGraph: {
      title: `${restaurant.name} — Lezzet-i Âlâ`,
      description: `${restaurant.name} dijital menüsünü görüntüleyin`,
      type: "website",
      ...(restaurant.coverImage && { images: [restaurant.coverImage] }),
    },
  };
}

/**
 * Tenant page — Server Component.
 *
 * Renders the menu for a restaurant resolved via subdomain or custom domain.
 * The middleware rewrites subdomain/custom-domain requests to /_tenant,
 * and this page reads the tenant headers to fetch the right restaurant.
 *
 * This is functionally identical to /menu/[slug]/page.tsx but resolves
 * the tenant from headers instead of URL params.
 */
export default async function TenantPage() {
  const restaurant = await resolveRestaurant();

  if (!restaurant) {
    notFound();
  }

  // Inactive restaurant — fully server-rendered, zero JS
  if (!restaurant.active) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-muted-foreground">
        <AlertTriangle className="w-12 h-12 mb-4 text-warning" />
        <p className="text-lg font-semibold">Menü geçici olarak kullanılamıyor</p>
        <p className="text-sm mt-2 text-muted-foreground">
          Bu restoranın menüsü şu anda aktif değil. Lütfen daha sonra tekrar
          kontrol edin.
        </p>
      </div>
    );
  }

  return <MenuShell restaurant={restaurant} />;
}
