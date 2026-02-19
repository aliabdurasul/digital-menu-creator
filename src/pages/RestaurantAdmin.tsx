import { useState } from "react";
import { AdminSidebar, type AdminTab } from "@/components/admin/AdminSidebar";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminCategories } from "@/components/admin/AdminCategories";
import { AdminProducts } from "@/components/admin/AdminProducts";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { mockRestaurants } from "@/lib/mockData";
import type { Restaurant } from "@/types";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RestaurantAdmin() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [restaurant, setRestaurant] = useState<Restaurant>(() => ({
    ...mockRestaurants[0],
    categories: [...mockRestaurants[0].categories],
    products: [...mockRestaurants[0].products],
  }));

  if (!loggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-full max-w-sm p-8 rounded-2xl bg-card border border-border shadow-lg text-center space-y-6">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl mx-auto flex items-center justify-center">
            <LogIn className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Restaurant Admin</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to manage your menu</p>
          </div>
          <Button onClick={() => setLoggedIn(true)} className="w-full">
            Sign In (Demo)
          </Button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <AdminDashboard restaurant={restaurant} />;
      case "categories":
        return <AdminCategories restaurant={restaurant} setRestaurant={setRestaurant} />;
      case "products":
        return <AdminProducts restaurant={restaurant} setRestaurant={setRestaurant} />;
      case "settings":
        return <AdminSettings restaurant={restaurant} setRestaurant={setRestaurant} />;
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
