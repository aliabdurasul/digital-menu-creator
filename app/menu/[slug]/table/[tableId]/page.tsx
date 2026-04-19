import { notFound } from "next/navigation";
import { getRestaurantBySlug, getRestaurantBySlugTranslated, getTableById } from "@/lib/db";
import { MenuShell } from "@/components/menu/MenuShell";
import { OrderingWrapper } from "@/components/menu/OrderingWrapper";
import { AutoDismissBanner } from "@/components/menu/AutoDismissBanner";
import { canUseFeature } from "@/lib/features/engine";
import { AlertTriangle, Lock } from "lucide-react";
import type { Metadata } from "next";
import type { Restaurant } from "@/types";

export const revalidate = 60;

interface TableMenuPageProps {
  params: { slug: string; tableId: string };
}

export async function generateMetadata({ params }: TableMenuPageProps): Promise<Metadata> {
  const restaurant = await getRestaurantBySlug(params.slug);
  if (!restaurant) return { title: "Menü Bulunamadı" };
  return {
    title: `${restaurant.name} — Sipariş Ver`,
    description: `${restaurant.name} masadan sipariş verin.`,
    manifest: `/api/manifest/${params.slug}`,
    appleWebApp: {
      capable: true,
      title: restaurant.name,
      statusBarStyle: "black-translucent",
    },
  };
}

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

export default async function TableMenuPage({ params }: TableMenuPageProps) {
  const [restaurantTr, restaurantEn, table] = await Promise.all([
    getRestaurantBySlug(params.slug),
    getRestaurantBySlugTranslated(params.slug, "en"),
    getTableById(params.tableId),
  ]);

  if (!restaurantTr) notFound();

  // Inactive restaurant
  if (!restaurantTr.active) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-muted-foreground">
        <AlertTriangle className="w-12 h-12 mb-4 text-warning" />
        <p className="text-lg font-semibold">Menü geçici olarak kullanılamıyor</p>
        <p className="text-sm mt-2">Bu restoranın menüsü şu anda aktif değil.</p>
      </div>
    );
  }

  // Table not found or inactive
  if (!table || table.status !== "active" || table.restaurant_id !== restaurantTr.id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-muted-foreground">
        <AlertTriangle className="w-12 h-12 mb-4 text-warning" />
        <p className="text-lg font-semibold">Masa bulunamadı</p>
        <p className="text-sm mt-2">Bu QR kod geçersiz veya masa artık aktif değil.</p>
      </div>
    );
  }

  // Plan check — table ordering requires pro
  if (!canUseFeature(restaurantTr.plan, "table_ordering")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-muted-foreground gap-3">
        <Lock className="w-12 h-12 text-muted-foreground" />
        <p className="text-lg font-semibold">Bu özellik aktif değil</p>
        <p className="text-sm">Masadan sipariş özelliği bu restoran için etkin değil.</p>
      </div>
    );
  }

  const enData =
    restaurantEn && hasEnglishContent(restaurantTr, restaurantEn)
      ? restaurantEn
      : null;

  return (
    <OrderingWrapper restaurantId={restaurantTr.id} tableId={table.id} moduleType={restaurantTr.moduleType}>
      {/* Location indicator — cafe: auto-dismiss toast, restaurant: persistent table label */}
      {restaurantTr.moduleType === "cafe" ? (
        <AutoDismissBanner duration={3000}>
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
            <span className="text-xs font-semibold text-primary">☕ Self Servis</span>
            <span className="text-xs text-muted-foreground">— bardan teslim alabilirsiniz</span>
          </div>
        </AutoDismissBanner>
      ) : (
        <div className="max-w-[480px] mx-auto px-4 pt-3">
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
            <span className="text-xs font-semibold text-primary">📍 {table.label}</span>
            <span className="text-xs text-muted-foreground">— siparişiniz bu masaya iletilecek</span>
          </div>
        </div>
      )}
      <MenuShell restaurant={restaurantTr} restaurantEn={enData} tableId={table.id} />
    </OrderingWrapper>
  );
}
