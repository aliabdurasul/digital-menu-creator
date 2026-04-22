"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/menu/CartProvider";

interface CartButtonProps {
  onClick: () => void;
}

export function CartButton({ onClick }: CartButtonProps) {
  const { totalItems } = useCart();

  if (totalItems === 0) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 right-5 z-40 flex items-center gap-2 rounded-full transition-all duration-200 active:scale-95"
      style={{
        padding: "12px 22px",
        background: "rgba(10,8,6,0.92)",
        border: "1px solid rgba(196,154,60,0.5)",
        color: "#c49a3c",
        backdropFilter: "blur(14px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
        fontFamily: "var(--font-outfit, sans-serif)",
      }}
    >
      <ShoppingBag className="w-4 h-4" />
      <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: "0.05em" }}>
        Sipariş &middot; {totalItems}
      </span>
    </button>
  );
}
