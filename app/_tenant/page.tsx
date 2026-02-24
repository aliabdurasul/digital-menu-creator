import { notFound } from "next/navigation";
import { getTenantFromHeaders } from "@/lib/tenant";
import { getRestaurantBySlug } from "@/lib/db";
import { MenuShell } from "@/components/menu/MenuShell";
import { AlertTriangle } from "lucide-react";

/** ISR — regenerate every 60 seconds */
export const revalidate = 60;

/**
 * Internal page rendered when middleware rewrites a custom-domain request
 * to /_tenant. The tenant info is passed via request headers.
 */
export default async function TenantPage() {
  const tenant = await getTenantFromHeaders();

  if (!tenant?.slug) {
    notFound();
  }

  const restaurant = await getRestaurantBySlug(tenant.slug);

  if (!restaurant) {
    notFound();
  }

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
