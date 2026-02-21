import type { Restaurant } from "@/types";
import { Eye, Package, FolderOpen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  restaurant: Restaurant;
}

export function AdminDashboard({ restaurant }: Props) {
  const activeProducts = restaurant.products.filter((p) => p.available).length;

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "";
  const publicUrl = `${appUrl}/menu/${restaurant.slug}`;

  const stats = [
    { label: "Toplam Görüntülenme", value: restaurant.totalViews.toLocaleString(), icon: Eye },
    { label: "Aktif Ürünler", value: activeProducts, icon: Package },
    { label: "Kategoriler", value: restaurant.categories.length, icon: FolderOpen },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Gösterge Paneli</h1>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open(publicUrl, "_blank")}
        >
          <ExternalLink className="w-4 h-4 mr-1" /> Menüyü Önizle
        </Button>
      </div>
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
