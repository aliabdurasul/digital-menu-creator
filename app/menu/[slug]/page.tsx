import { notFound } from "next/navigation";
import { getRestaurantBySlug, getRestaurantBySlugTranslated } from "@/lib/db";
import { MenuShell } from "@/components/menu/MenuShell";
import { LoyaltyProvider } from "@/components/menu/LoyaltyProvider";
import { OrderingWrapper } from "@/components/menu/OrderingWrapper";
import { CoffeeClubPanel } from "@/components/loyalty/CoffeeClubPanel";
import { PushPermissionSheet } from "@/components/loyalty/PushPermissionSheet";
import { PublicInstallTrigger } from "@/components/loyalty/PublicInstallTrigger";
import { canUseFeature } from "@/lib/features/engine";
import { AlertTriangle } from "lucide-react";
import type { Metadata, } from "next";

/** ISR: regenerate every 60 seconds */
export const revalidate = 60;

interface MenuPageProps {
  params: { slug: string };
  searchParams: { lang?: string };
}

/** Dynamic SEO metadata per restaurant */
export async function generateMetadata({
  params,
}: MenuPageProps): Promise<Metadata> {
  const restaurant = await getRestaurantBySlug(params.slug);

  if (!restaurant) {
    return { title: "Menü Bulunamadı" };
  }
  return {
    title: `${restaurant.name} — Dijital Menü`,
    description: `${restaurant.name} dijital menüsünü görüntüleyin. Kategorilere göz atın, fiyatları görün.`,
    manifest: `/api/manifest/${params.slug}`,
    appleWebApp: {
      capable: true,
      title: restaurant.name,
      statusBarStyle: "black-translucent",
    },
    openGraph: {
      title: `${restaurant.name} — Dijital Menü`,
      description: `${restaurant.name} dijital menüsünü görüntüleyin`,
      type: "website",
      ...(restaurant.coverImage && { images: [restaurant.coverImage] }),
    },
  };
}

/** Server Component — renders full HTML on server, minimal JS shipped */
export default async function MenuPage({ params }: MenuPageProps) {
  // Dual-fetch: TR (base) + EN (translated) in parallel
  const [restaurantTr, restaurantEn] = await Promise.all([
    getRestaurantBySlug(params.slug),
    getRestaurantBySlugTranslated(params.slug, "en"),
  ]);

  if (!restaurantTr) {
    notFound();
  }

  // Inactive restaurant — fully server-rendered, zero JS
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

  // Pass EN data whenever the fetch succeeded — toggle visibility
  // is controlled by whether restaurantEn exists, not by content diff.
  const enData = restaurantEn ?? null;

  // Cafe tenants on the pro plan get self-service ordering on the general route.
  // LoyaltyProvider is the parent so we pass withLoyalty={false} to avoid nesting.
  const canOrder =
    canUseFeature(restaurantTr.plan, "table_ordering") &&
    restaurantTr.moduleType === "cafe";

  return (
    <LoyaltyProvider restaurantId={restaurantTr.id}>
      {canOrder ? (
        <OrderingWrapper
          restaurantId={restaurantTr.id}
          moduleType="cafe"
          withLoyalty={false}
        >
          <MenuShell restaurant={restaurantTr} restaurantEn={enData} />
        </OrderingWrapper>
      ) : (
        <MenuShell restaurant={restaurantTr} restaurantEn={enData} />
      )}
      <CoffeeClubPanel />
      <PushPermissionSheet />
      <PublicInstallTrigger />
    </LoyaltyProvider>
  );
}
