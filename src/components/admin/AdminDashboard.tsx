"use client";

import { useState, useEffect } from "react";
import type { Restaurant, ModuleType } from "@/types";
import { Package, FolderOpen, ExternalLink, ShoppingCart, CheckCircle2, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface Props {
  restaurant: Restaurant;
  moduleType?: ModuleType;
}

export function AdminDashboard({ restaurant, moduleType = "restaurant" }: Props) {
  const activeProducts = restaurant.products.filter((p) => p.available).length;
  const [cafeStats, setCafeStats] = useState({ activeOrders: 0, readyOrders: 0, todayCustomers: 0, todayRevenue: 0 });

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "";
  const publicUrl = `${appUrl}/menu/${restaurant.slug}`;
  const isCafe = moduleType === "cafe";

  useEffect(() => {
    if (!isCafe) return;

    async function fetchCafeStats() {
      const supabase = createClient();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [activeRes, readyRes, customersRes, revenueRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", restaurant.id)
          .in("status", ["pending", "preparing", "ready"]),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", restaurant.id)
          .eq("status", "ready"),
        supabase
          .from("orders")
          .select("customer_id")
          .eq("restaurant_id", restaurant.id)
          .gte("created_at", todayStart.toISOString())
          .not("customer_id", "is", null),
        supabase
          .from("orders")
          .select("total")
          .eq("restaurant_id", restaurant.id)
          .gte("created_at", todayStart.toISOString())
          .in("status", ["pending", "preparing", "ready", "delivered"]),
      ]);

      const uniqueCustomers = new Set(
        (customersRes.data || []).map((o: { customer_id: string }) => o.customer_id)
      ).size;

      const totalRevenue = (revenueRes.data || []).reduce(
        (sum: number, o: { total: number }) => sum + Number(o.total),
        0
      );

      setCafeStats({
        activeOrders: activeRes.count ?? 0,
        readyOrders: readyRes.count ?? 0,
        todayCustomers: uniqueCustomers,
        todayRevenue: totalRevenue,
      });
    }

    fetchCafeStats();
    const interval = setInterval(fetchCafeStats, 30000);
    return () => clearInterval(interval);
  }, [isCafe, restaurant.id]);

  const restaurantStats = [
    { label: "Aktif Ürünler", value: activeProducts, icon: Package },
    { label: "Kategoriler", value: restaurant.categories.length, icon: FolderOpen },
  ];

  const cafeStatsCards = [
    { label: "Aktif Siparişler", value: cafeStats.activeOrders, icon: ShoppingCart },
    { label: "Hazır Bekleyen", value: cafeStats.readyOrders, icon: CheckCircle2 },
    { label: "Bugün Müşteri", value: cafeStats.todayCustomers, icon: Users },
    { label: "Bugün Gelir", value: `₺${cafeStats.todayRevenue.toFixed(2)}`, icon: TrendingUp },
  ];

  const stats = isCafe ? cafeStatsCards : restaurantStats;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {isCafe ? "Kafe Paneli" : "Gösterge Paneli"}
        </h1>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open(publicUrl, "_blank")}
        >
          <ExternalLink className="w-4 h-4 mr-1" /> Menüyü Önizle
        </Button>
      </div>
      <div className={`grid grid-cols-1 gap-4 ${isCafe ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2"}`}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-2xl p-6 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <stat.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
