"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { CartItem } from "@/types";

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

const STORAGE_KEY = "cart";

function loadCart(tableId: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(`${STORAGE_KEY}_${tableId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(tableId: string, items: CartItem[]) {
  try {
    sessionStorage.setItem(`${STORAGE_KEY}_${tableId}`, JSON.stringify(items));
  } catch {
    // sessionStorage full or unavailable
  }
}

export function CartProvider({
  tableId,
  children,
}: {
  tableId: string;
  children: ReactNode;
}) {
  // Start empty so server render and client first render always match.
  // sessionStorage is read in the effect below — avoids SSR/hydration mismatch.
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load persisted cart on client mount (runs after hydration)
  useEffect(() => {
    setItems(loadCart(tableId));
    setIsHydrated(true);
  }, [tableId]);

  // Persist cart changes — skip until after initial load to avoid saving []
  useEffect(() => {
    if (!isHydrated) return;
    saveCart(tableId, items);
  }, [items, tableId, isHydrated]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      // Reward / point-store items always get their own line (never merge)
      if (item.type === "loyalty_reward" || item.type === "point_store_reward") {
        return [...prev, { ...item, quantity: 1 }];
      }
      // Regular items merge by menuItemId (only with other regular items)
      const existing = prev.find((i) => i.lineId === item.lineId && !i.type);
      if (existing) {
        return prev.map((i) =>
          i.lineId === item.lineId && !i.type
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((lineId: string) => {
    setItems((prev) => prev.filter((i) => i.lineId !== lineId));
  }, []);

  const updateQuantity = useCallback((lineId: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.lineId !== lineId));
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.lineId === lineId ? { ...i, quantity: qty } : i
        )
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    try {
      sessionStorage.removeItem(`${STORAGE_KEY}_${tableId}`);
    } catch {
      // ignore
    }
  }, [tableId]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  );
}
