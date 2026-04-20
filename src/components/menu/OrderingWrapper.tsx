"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { CartProvider, useCart } from "@/components/menu/CartProvider";
import { CartButton } from "@/components/menu/CartButton";
import { CartDrawer } from "@/components/menu/CartDrawer";
import { OrderReadyWatcher } from "@/components/menu/OrderReadyWatcher";
import { LoyaltyProvider, useLoyalty } from "@/components/menu/LoyaltyProvider";
import { CoffeeClubPanel } from "@/components/loyalty/CoffeeClubPanel";
import { PushPermissionSheet } from "@/components/loyalty/PushPermissionSheet";
import { InstallPromptSheet } from "@/components/loyalty/InstallPromptSheet";
import { useInstallPrompt, InstallPromptProvider } from "@/hooks/useInstallPrompt";

interface OrderingWrapperProps {
  restaurantId: string;
  /** Specific table for table-delivery orders. Omit for self-service (general route). */
  tableId?: string;
  moduleType?: "cafe" | "restaurant";
  /**
   * When false, skips the internal LoyaltyProvider wrapper.
   * Use this when a parent component already provides LoyaltyProvider.
   * Defaults to true (table route behaviour — wraps its own loyalty context).
   */
  withLoyalty?: boolean;
  children: React.ReactNode;
}

/**
 * Wraps the menu in CartProvider + floating CartButton + CartDrawer.
 * Supports both table-delivery (tableId present) and self-service (no tableId).
 */
export function OrderingWrapper({ restaurantId, tableId, moduleType, withLoyalty = true, children }: OrderingWrapperProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [installSheetOpen, setInstallSheetOpen] = useState(false);

  // Stable per-restaurant storage scope for self-service so the cart
  // persists between navigations but never bleeds across tenants.
  const cartScope = tableId ?? `self_${restaurantId}`;

  const cartTree = (
    <CartProvider tableId={cartScope}>
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
      {withLoyalty && <CoffeeClubPanel onOpenCart={() => setDrawerOpen(true)} />}
      {/* Install prompt only fires on the self-service route (no tableId). */}
      {/* Showing it on a table QR would make the installed PWA open pinned to that table. */}
      {!tableId && <CartPushTrigger onTriggerInstall={() => setInstallSheetOpen(true)} />}
      {withLoyalty && <PushPermissionSheet />}
      {!tableId && (
        <InstallPromptSheet
          open={installSheetOpen}
          onClose={() => setInstallSheetOpen(false)}
          restaurantId={restaurantId}
        />
      )}
    </CartProvider>
  );

  if (!withLoyalty) return <InstallPromptProvider>{cartTree}</InstallPromptProvider>;

  return (
    <InstallPromptProvider>
      <LoyaltyProvider restaurantId={restaurantId}>
        <CartOpenRegistrar openDrawer={() => setDrawerOpen(true)} />
        {cartTree}
      </LoyaltyProvider>
    </InstallPromptProvider>
  );
}

/**
 * Bridges LoyaltyProvider.registerOpenCart ↔ OrderingWrapper.setDrawerOpen.
 * Must be rendered inside LoyaltyProvider.
 */
function CartOpenRegistrar({ openDrawer }: { openDrawer: () => void }) {
  const loyalty = useLoyalty();
  const stableOpen = useCallback(() => openDrawer(), [openDrawer]);
  useEffect(() => {
    loyalty?.registerOpenCart(stableOpen);
  }, [loyalty, stableOpen]);
  return null;
}

/**
 * Inner component that watches cart + push status, then shows prompts in sequence:
 * 1st item added (1.5s) → PushPermissionSheet (once per session)
 * 3rd item added (or push already handled) → InstallPromptSheet (once per session, 48h snooze)
 * Never shows both sheets simultaneously.
 */
function CartPushTrigger({ onTriggerInstall }: { onTriggerInstall: () => void }) {
  const { items } = useCart();
  const loyalty = useLoyalty();
  const { canInstall } = useInstallPrompt();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Push prompt is ONLY shown via explicit user taps:
  // - "Hazır olunca bildir" button on the order success screen
  // - Bell icon in CoffeeClubPanel
  // Automatic cart-add trigger removed to avoid Chrome spam classification.
  // See: https://developer.chrome.com/blog/notification-permission-recommendations

  // Detect iOS non-standalone for manual install prompt
  const isIOS =
    typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true);
  const needsManual = isIOS && !isStandalone;

  // Install sheet: fires once per session on 3rd item add (push has had a chance to show first)
  useEffect(() => {
    if (!canInstall && !needsManual) return;
    if (items.length !== 3) return;
    if (typeof window !== "undefined" && sessionStorage.getItem("install_triggered")) return;
    const installSnoozed = localStorage.getItem("install_prompt_snoozed");
    if (installSnoozed && Date.now() < new Date(installSnoozed).getTime() + 48 * 60 * 60 * 1000) return;

    timerRef.current = setTimeout(() => {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("install_triggered", "1");
      }
      onTriggerInstall();
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, canInstall, needsManual]);

  return null;
}
