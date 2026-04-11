"use client";

import { useState } from "react";
import { CartProvider } from "@/components/menu/CartProvider";
import { CartButton } from "@/components/menu/CartButton";
import { CartDrawer } from "@/components/menu/CartDrawer";
import { OrderReadyWatcher } from "@/components/menu/OrderReadyWatcher";
import { LoyaltyProvider } from "@/components/menu/LoyaltyProvider";
import { CoffeeClubButton } from "@/components/loyalty/CoffeeClubButton";
import { CoffeeClubPanel } from "@/components/loyalty/CoffeeClubPanel";

interface OrderingWrapperProps {
  restaurantId: string;
  tableId: string;
  moduleType?: "cafe" | "restaurant";
  children: React.ReactNode;
}

/**
 * Wraps the menu in CartProvider + floating CartButton + CartDrawer.
 * Only mounted when the customer is on a table-specific URL.
 */
export function OrderingWrapper({ restaurantId, tableId, moduleType, children }: OrderingWrapperProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [clubOpen, setClubOpen] = useState(false);
  const isCafe = moduleType === "cafe";

  return (
    <LoyaltyProvider restaurantId={restaurantId}>
      <CartProvider tableId={tableId}>
        {children}
        {isCafe && (
          <div className="fixed top-3 left-4 z-10">
            <CoffeeClubButton onClick={() => setClubOpen(true)} />
          </div>
        )}
        <CartButton onClick={() => setDrawerOpen(true)} />
        <CartDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          restaurantId={restaurantId}
          tableId={tableId}
          moduleType={moduleType}
        />
        {isCafe && (
          <CoffeeClubPanel open={clubOpen} onClose={() => setClubOpen(false)} />
        )}
        <OrderReadyWatcher moduleType={moduleType} />
      </CartProvider>
    </LoyaltyProvider>
  );
}
