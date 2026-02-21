"use client";

import { useState, useEffect } from "react";
import { AdminSidebar, type AdminTab } from "@/components/admin/AdminSidebar";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminCategories } from "@/components/admin/AdminCategories";
import { AdminProducts } from "@/components/admin/AdminProducts";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { AdminQRCode } from "@/components/admin/AdminQRCode";
import { mockRestaurants } from "@/lib/mockData";
import type { Restaurant } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function RestaurantAdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRestaurant() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Try to get the user's restaurant from profiles
          const { data: profile } = await supabase
            .from("profiles")
            .select("restaurant_id")
            .eq("id", user.id)
            .single();

          if (profile?.restaurant_id) {
            // Try to fetch real restaurant data
            const { data: dbRestaurant } = await supabase
              .from("restaurants")
              .select("*")
              .eq("id", profile.restaurant_id)
              .single();

            if (dbRestaurant) {
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
                categories: (categories || []).map((c: { id: string; name: string; order: number }) => ({
                  id: c.id,
                  name: c.name,
                  order: c.order,
                })),
                products: (items || []).map((i: { id: string; name: string; description: string; price: number; image_url: string; category_id: string; is_available: boolean; order: number }) => ({
                  id: i.id,
                  name: i.name,
                  description: i.description,
                  price: i.price,
                  image: i.image_url || "",
                  categoryId: i.category_id,
                  available: i.is_available,
                  order: i.order,
                })),
                plan: dbRestaurant.plan || "basic",
                active: dbRestaurant.active ?? true,
                totalViews: dbRestaurant.total_views || 0,
              });
              setLoading(false);
              return;
            }
          }
        }
      } catch {
        // DB not ready — fall through to mock
      }

      // TODO: Remove mock fallback when DB is ready
      setRestaurant({
        ...mockRestaurants[0],
        categories: [...mockRestaurants[0].categories],
        products: [...mockRestaurants[0].products],
      });
      setLoading(false);
    }

    loadRestaurant();
  }, []);

  if (loading || !restaurant) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
