"use client";

import { ShoppingCart } from "lucide-react";
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
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
    >
      <ShoppingCart className="w-5 h-5" />
      <span className="font-semibold text-sm">
        Sepet ({totalItems})
      </span>
    </button>
  );
}
