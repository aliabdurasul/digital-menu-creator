"use client";

import { useState } from "react";
import { CartProvider } from "@/components/menu/CartProvider";
import { CartButton } from "@/components/menu/CartButton";
import { CartDrawer } from "@/components/menu/CartDrawer";

interface OrderingWrapperProps {
  restaurantId: string;
  tableId: string;
  children: React.ReactNode;
}

/**
 * Wraps the menu in CartProvider + floating CartButton + CartDrawer.
 * Only mounted when the customer is on a table-specific URL.
 */
export function OrderingWrapper({ restaurantId, tableId, children }: OrderingWrapperProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <CartProvider tableId={tableId}>
      {children}
      <CartButton onClick={() => setDrawerOpen(true)} />
      <CartDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        restaurantId={restaurantId}
        tableId={tableId}
      />
    </CartProvider>
  );
}
