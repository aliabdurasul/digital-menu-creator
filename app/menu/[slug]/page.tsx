import { notFound } from "next/navigation";
import { getRestaurantBySlug, getRestaurantBySlugTranslated } from "@/lib/db";
import { MenuShell } from "@/components/menu/MenuShell";
import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";

/** ISR: regenerate every 60 seconds */
export const revalidate = 60;

interface MenuPageProps {
  params: { slug: string };
  searchParams: { lang?: string };
}

/** Dynamic SEO metadata per restaurant */
export async function generateMetadata({
  params,
  searchParams,
}: MenuPageProps): Promise<Metadata> {
  const lang = searchParams.lang || "tr";
  const restaurant =
    lang !== "tr"
      ? await getRestaurantBySlugTranslated(params.slug, lang)
      : await getRestaurantBySlug(params.slug);

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

/** Server Component — renders full HTML on server, minimal JS shipped */
export default async function MenuPage({ params, searchParams }: MenuPageProps) {
  const lang = searchParams.lang || "tr";
  const restaurant =
    lang !== "tr"
      ? await getRestaurantBySlugTranslated(params.slug, lang)
      : await getRestaurantBySlug(params.slug);

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
