import { notFound } from "next/navigation";
import { getRestaurantBySlug, getRestaurantBySlugTranslated } from "@/lib/db";
import { MenuShell } from "@/components/menu/MenuShell";
import { LoyaltyProvider } from "@/components/menu/LoyaltyProvider";
import { CoffeeClubPanel } from "@/components/loyalty/CoffeeClubPanel";
import { PushPermissionSheet } from "@/components/loyalty/PushPermissionSheet";
import { AlertTriangle } from "lucide-react";
import type { Metadata, } from "next";
import type { Restaurant } from "@/types";

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
    openGraph: {
      title: `${restaurant.name} — Dijital Menü`,
      description: `${restaurant.name} dijital menüsünü görüntüleyin`,
      type: "website",
      ...(restaurant.coverImage && { images: [restaurant.coverImage] }),
    },
  };
}

/**
 * Detect whether the EN restaurant data has any meaningful translations
 * compared to the base TR data (at least one name or description differs).
 */
function hasEnglishContent(tr: Restaurant, en: Restaurant): boolean {
  if (tr.name !== en.name) return true;
  if (tr.description !== en.description) return true;
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

  // Only pass EN data if meaningful translations exist
  const enData =
    restaurantEn && hasEnglishContent(restaurantTr, restaurantEn)
      ? restaurantEn
      : null;

  return (
    <LoyaltyProvider restaurantId={restaurantTr.id}>
      <MenuShell restaurant={restaurantTr} restaurantEn={enData} />
      <CoffeeClubPanel />
      <PushPermissionSheet />
    </LoyaltyProvider>
  );
}
