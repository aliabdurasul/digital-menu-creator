import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/db";
import { MenuShell } from "@/components/menu/MenuShell";
import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";

/** ISR: regenerate every 60 seconds */
export const revalidate = 60;

interface MenuPageProps {
  params: { slug: string };
}

/** Dynamic SEO metadata per restaurant */
export async function generateMetadata({
  params,
}: MenuPageProps): Promise<Metadata> {
  const restaurant = await getRestaurantBySlug(params.slug);
  if (!restaurant) {
    return { title: "Menu Not Found" };
  }
  return {
    title: `${restaurant.name} — Digital Menu`,
    description: `View the digital menu for ${restaurant.name}. Browse categories, see prices, and discover delicious dishes.`,
    openGraph: {
      title: `${restaurant.name} — Digital Menu`,
      description: `View the digital menu for ${restaurant.name}`,
      type: "website",
      ...(restaurant.coverImage && { images: [restaurant.coverImage] }),
    },
  };
}

/** Server Component — renders full HTML on server, minimal JS shipped */
export default async function MenuPage({ params }: MenuPageProps) {
  const restaurant = await getRestaurantBySlug(params.slug);

  if (!restaurant) {
    notFound();
  }

  // Inactive restaurant — fully server-rendered, zero JS
  if (!restaurant.active) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-muted-foreground">
        <AlertTriangle className="w-12 h-12 mb-4 text-warning" />
        <p className="text-lg font-semibold">Menu temporarily unavailable</p>
        <p className="text-sm mt-2 text-muted-foreground">
          This restaurant&apos;s menu is currently inactive. Please check back
          later.
        </p>
      </div>
    );
  }

  return <MenuShell restaurant={restaurant} />;
}
