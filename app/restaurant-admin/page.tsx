"use client";

import { useState, useEffect } from "react";
import { AdminSidebar, type AdminTab } from "@/components/admin/AdminSidebar";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminCategories } from "@/components/admin/AdminCategories";
import { AdminProducts } from "@/components/admin/AdminProducts";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { AdminQRCode } from "@/components/admin/AdminQRCode";
import type { Restaurant } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { Loader2, AlertTriangle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function RestaurantAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRestaurant() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("restaurant_id")
          .eq("id", user.id)
          .single();

        if (!profile?.restaurant_id) {
          setError("NO_RESTAURANT");
          setLoading(false);
          return;
        }

        const { data: dbRestaurant, error: rError } = await supabase
          .from("restaurants")
          .select("*")
          .eq("id", profile.restaurant_id)
          .single();

        if (rError || !dbRestaurant) {
          setError("Failed to load restaurant data");
          setLoading(false);
          return;
        }

        const { data: categories } = await supabase
          .from("categories")
          .select("*")
          .eq("restaurant_id", dbRestaurant.id)
          .order("order");

        const { data: items } = await supabase
          .from("menu_items")
          .select("*")
          .eq("restaurant_id", dbRestaurant.id)
          .order("order");

        setRestaurant({
          id: dbRestaurant.id,
          slug: dbRestaurant.slug,
          name: dbRestaurant.name,
          logo: dbRestaurant.logo_url || "",
          coverImage: dbRestaurant.cover_image_url || "",
          categories: (categories || []).map(
            (c: { id: string; name: string; order: number }) => ({
              id: c.id,
              name: c.name,
              order: c.order,
            })
          ),
          products: (items || []).map(
            (i: {
              id: string;
              name: string;
              description: string;
              price: number;
              image_url: string;
              category_id: string;
              is_available: boolean;
              order: number;
            }) => ({
              id: i.id,
              name: i.name,
              description: i.description,
              price: i.price,
              image: i.image_url || "",
              categoryId: i.category_id,
              available: i.is_available,
              order: i.order,
            })
          ),
          plan: dbRestaurant.plan || "basic",
          active: dbRestaurant.active ?? true,
          totalViews: dbRestaurant.total_views || 0,
        });
      } catch {
        setError("Something went wrong loading your restaurant");
      } finally {
        setLoading(false);
      }
    }

    loadRestaurant();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error === "NO_RESTAURANT") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30 gap-4 p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-500" />
        <h2 className="text-xl font-bold">No Restaurant Assigned</h2>
        <p className="text-muted-foreground max-w-md">
          Your account doesn&apos;t have a restaurant assigned yet. Please
          contact the super admin to get set up.
        </p>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30 gap-4 p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-bold">Error</h2>
        <p className="text-muted-foreground">{error || "Unknown error"}</p>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <AdminDashboard restaurant={restaurant} />;
      case "categories":
        return (
          <AdminCategories
            restaurant={restaurant}
            setRestaurant={setRestaurant}
          />
        );
      case "products":
        return (
          <AdminProducts
            restaurant={restaurant}
            setRestaurant={setRestaurant}
          />
        );
      case "settings":
        return (
          <AdminSettings
            restaurant={restaurant}
            setRestaurant={setRestaurant}
          />
        );
      case "qr":
        return <AdminQRCode restaurant={restaurant} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 p-6 sm:p-8 overflow-auto">
        {renderContent()}
      </main>
    </div>
  );
}
