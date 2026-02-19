import type { Restaurant } from "@/types";
import { Eye, Package, FolderOpen } from "lucide-react";

interface Props {
  restaurant: Restaurant;
}

export function AdminDashboard({ restaurant }: Props) {
  const activeProducts = restaurant.products.filter((p) => p.available).length;

  const stats = [
    { label: "Total Views", value: restaurant.totalViews.toLocaleString(), icon: Eye },
    { label: "Active Products", value: activeProducts, icon: Package },
    { label: "Categories", value: restaurant.categories.length, icon: FolderOpen },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
