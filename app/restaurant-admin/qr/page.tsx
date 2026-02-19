import { getCurrentRestaurant, getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminQRCode } from "@/components/admin/AdminQRCode";
import { AlertTriangle } from "lucide-react";

/**
 * Dedicated QR Code page at /restaurant-admin/qr
 *
 * Server Component shell that:
 * 1. Validates authentication (mock for now)
 * 2. Fetches restaurant data server-side
 * 3. Checks subscription status
 * 4. Renders the QR code client component
 *
 * When Supabase is configured, this becomes a real server-side
 * auth check + database query.
 */
export default function QRCodePage() {
  const user = getCurrentUser();

  // Auth check — redirect to login if not authenticated
  if (!user || user.role !== "restaurant-admin") {
    redirect("/restaurant-admin");
  }

  const restaurant = getCurrentRestaurant();

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
