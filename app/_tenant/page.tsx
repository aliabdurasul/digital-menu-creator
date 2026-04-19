import { notFound } from "next/navigation";
import { getTenantFromHeaders } from "@/lib/tenant";
import { getRestaurantBySlug, getRestaurantBySlugTranslated } from "@/lib/db";
import { MenuShell } from "@/components/menu/MenuShell";
import { LoyaltyProvider } from "@/components/menu/LoyaltyProvider";
import { CoffeeClubPanel } from "@/components/loyalty/CoffeeClubPanel";
import { PushPermissionSheet } from "@/components/loyalty/PushPermissionSheet";
import { PublicInstallTrigger } from "@/components/loyalty/PublicInstallTrigger";
import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";
import type { Restaurant } from "@/types";

/** ISR — regenerate every 60 seconds */
export const revalidate = 60;

/** Dynamic metadata for tenant pages — tenant-specific manifest + apple web app title */
export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders();
  if (!tenant?.slug) return { title: "Menü" };
  const restaurant = await getRestaurantBySlug(tenant.slug);
  if (!restaurant) return { title: "Menü Bulunamadı" };
  return {
    title: `${restaurant.name} — Dijital Menü`,
    description: `${restaurant.name} dijital menüsünü görüntüleyin.`,
    manifest: `/api/manifest/${tenant.slug}`,
    appleWebApp: {
      capable: true,
      title: restaurant.name,
      statusBarStyle: "black-translucent",
    },
  };
}

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

  return (
    <LoyaltyProvider restaurantId={restaurantTr.id}>
      <MenuShell restaurant={restaurantTr} restaurantEn={enData} />
      <CoffeeClubPanel />
      <PushPermissionSheet />
      <PublicInstallTrigger />
    </LoyaltyProvider>
  );
}
