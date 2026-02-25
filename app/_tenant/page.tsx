import { notFound } from "next/navigation";
import { getTenantFromHeaders } from "@/lib/tenant";
import { getRestaurantBySlug, getRestaurantBySlugTranslated } from "@/lib/db";
import { MenuShell } from "@/components/menu/MenuShell";
import { AlertTriangle } from "lucide-react";
import type { Restaurant } from "@/types";

/** ISR — regenerate every 60 seconds */
export const revalidate = 60;

function hasEnglishContent(tr: Restaurant, en: Restaurant): boolean {
  if (tr.name !== en.name || tr.description !== en.description) return true;
  for (let i = 0; i < tr.categories.length; i++) {
    if (tr.categories[i]?.name !== en.categories[i]?.name) return true;
  }
  for (let i = 0; i < tr.products.length; i++) {
    const tp = tr.products[i];
    const ep = en.products[i];
    if (tp?.name !== ep?.name || tp?.description !== ep?.description) return true;
  }
  return false;
}

/**
 * Internal page rendered when middleware rewrites a custom-domain request
 * to /_tenant. The tenant info is passed via request headers.
 */
export default async function TenantPage() {
  const tenant = await getTenantFromHeaders();

  if (!tenant?.slug) {
    notFound();
  }

  const [restaurantTr, restaurantEn] = await Promise.all([
    getRestaurantBySlug(tenant.slug),
    getRestaurantBySlugTranslated(tenant.slug, "en"),
  ]);

  if (!restaurantTr) {
    notFound();
  }

  if (!restaurantTr.active) {
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

  const enData =
    restaurantEn && hasEnglishContent(restaurantTr, restaurantEn)
      ? restaurantEn
      : null;

  return <MenuShell restaurant={restaurantTr} restaurantEn={enData} />;
}
