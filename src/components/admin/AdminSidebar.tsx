import { LayoutDashboard, FolderOpen, Package, Settings, ChevronLeft, ChevronRight, QrCode, LogOut, Languages, LayoutGrid, Receipt, Award } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { canUseFeature } from "@/lib/features/engine";
import { ProBadge } from "@/lib/features/hooks";
import type { PlanType, ModuleType } from "@/lib/features/flags";

export type AdminTab = "dashboard" | "categories" | "products" | "settings" | "qr" | "translations" | "tables" | "orders" | "loyalty";

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  plan?: PlanType;
  moduleType?: ModuleType;
}

const navItems: { id: AdminTab; label: string; cafeLabel?: string; icon: React.ElementType; proOnly?: boolean; feature?: import("@/lib/features/flags").FeatureKey }[] = [
  { id: "dashboard", label: "Gösterge Paneli", cafeLabel: "Kafe Paneli", icon: LayoutDashboard },
  { id: "categories", label: "Kategoriler", icon: FolderOpen },
  { id: "products", label: "Ürünler", icon: Package },
  { id: "tables", label: "Masalar", icon: LayoutGrid, proOnly: true, feature: "table_ordering" },
  { id: "orders", label: "Siparişler", cafeLabel: "Bar Paneli", icon: Receipt, proOnly: true, feature: "table_ordering" },
  { id: "loyalty", label: "Sadakat", icon: Award, feature: "loyalty" },
  { id: "qr", label: "QR Kod", icon: QrCode },
  { id: "translations", label: "Çeviriler", icon: Languages, proOnly: true, feature: "translations" },
  { id: "settings", label: "Ayarlar", cafeLabel: "Kafe Ayarları", icon: Settings },
];

export function AdminSidebar({ activeTab, onTabChange, plan = "basic", moduleType = "restaurant" }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside
      className={`bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      } shrink-0 min-h-screen`}
    >
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <span className="font-bold text-sm text-sidebar-foreground">
            {moduleType === "cafe" ? "Kafe Yönetimi" : "Yönetim Paneli"}
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const isLocked = item.proOnly && item.feature && !canUseFeature(plan, item.feature, moduleType);
          return (
            <button
              key={item.id}
              onClick={() => !isLocked && onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isLocked
                  ? "text-sidebar-foreground/40 cursor-not-allowed"
                  : isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <span className="flex items-center gap-2">
                  {moduleType === "cafe" && item.cafeLabel ? item.cafeLabel : item.label}
                  {item.proOnly && <ProBadge />}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Çıkış Yap</span>}
        </button>
      </div>
    </aside>
  );
}
