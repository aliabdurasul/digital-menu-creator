import { getCurrentRestaurant, getCurrentUser } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { AdminQRCode } from "@/components/admin/AdminQRCode";
import { AlertTriangle } from "lucide-react";

/**
 * Dedicated QR Code page at /restaurant-admin/qr
 *
 * Server Component that:
 * 1. Validates authentication via Supabase
 * 2. Fetches restaurant data server-side
 * 3. Renders the QR code client component
 */
export default async function QRCodePage() {
  const user = await getCurrentUser();

  // Auth check — redirect to login if not authenticated
  if (!user || user.role !== "restaurant_admin") {
    redirect("/login");
  }

  const restaurant = await getCurrentRestaurant();

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <AlertTriangle className="w-12 h-12 mb-4 text-destructive" />
        <p className="text-lg font-semibold text-foreground">
          Restaurant not found
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Unable to load your restaurant data.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-4xl mx-auto p-6 sm:p-8">
        <AdminQRCode restaurant={restaurant} />
      </div>
    </div>
  );
}
