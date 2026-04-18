"use client";

import { useState, useEffect, useRef } from "react";
import { CartProvider, useCart } from "@/components/menu/CartProvider";
import { CartButton } from "@/components/menu/CartButton";
import { CartDrawer } from "@/components/menu/CartDrawer";
import { OrderReadyWatcher } from "@/components/menu/OrderReadyWatcher";
import { LoyaltyProvider, useLoyalty } from "@/components/menu/LoyaltyProvider";
import { CoffeeClubPanel } from "@/components/loyalty/CoffeeClubPanel";
import { PushPermissionSheet } from "@/components/loyalty/PushPermissionSheet";

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

  return (
    <LoyaltyProvider restaurantId={restaurantId}>
      <CartProvider tableId={tableId}>
        {children}
        <CartButton onClick={() => setDrawerOpen(true)} />
        <CartDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          restaurantId={restaurantId}
          tableId={tableId}
          moduleType={moduleType}
        />
        <OrderReadyWatcher moduleType={moduleType} />
        <CoffeeClubPanel />
        <CartPushTrigger />
        <PushPermissionSheet />
      </CartProvider>
    </LoyaltyProvider>
  );
}

/**
 * Inner component (lives inside CartProvider + LoyaltyProvider) that watches the
 * cart item count and triggers the push permission sheet 1.5 s after the first
 * item is added. Fires at most once per session via sessionStorage.
 */
function CartPushTrigger() {
  const { items } = useCart();
  const loyalty = useLoyalty();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (items.length !== 1) return;
    if (typeof window !== "undefined" && sessionStorage.getItem("push_cart_triggered")) return;

    timerRef.current = setTimeout(() => {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("push_cart_triggered", "1");
      }
      loyalty?.triggerPushSheet("cart_add");
    }, 1500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  return null;
}
