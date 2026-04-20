"use client";

import { useState, useEffect, useCallback } from "react";
import { Store, Gift, Star, Loader2, ChevronDown } from "lucide-react";
import { useLoyalty } from "@/components/menu/LoyaltyProvider";
import type { PointStoreItem } from "@/types";

interface Props {
  restaurantId: string;
  open: boolean;
  onClose: () => void;
}

export function PointStoreSheet({ restaurantId, open, onClose }: Props) {
  const loyalty = useLoyalty();
  const [items, setItems] = useState<PointStoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);

  const balance = loyalty?.progress?.points?.balance ?? 0;

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setRedeemSuccess(null);
    fetch(`/api/loyalty/store?restaurantId=${restaurantId}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open, restaurantId]);

  const handleRedeem = useCallback(async (item: PointStoreItem) => {
    if (!loyalty?.customerKey || balance < item.cost_points) return;
    setRedeeming(item.id);
    try {
      const res = await fetch("/api/loyalty/store/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerKey: loyalty.customerKey,
          restaurantId,
          storeItemId: item.id,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setRedeemSuccess(item.id);
        loyalty.refetch();
      }
    } catch { /* ignore */ }
    setRedeeming(null);
  }, [loyalty, restaurantId, balance]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 mt-auto w-full max-w-[480px] mx-auto max-h-[80vh] bg-[#F8F6F3] rounded-t-3xl shadow-2xl flex flex-col animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <Store className="w-5 h-5 text-[#6B4226]" />
            <h2 className="text-lg font-bold text-[#3D2C1E]">Puan Mağazası</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#C89B3C]/10 border border-[#C89B3C]/20">
              <Star className="w-3.5 h-3.5 text-[#C89B3C] fill-[#C89B3C]" />
              <span className="text-sm font-bold text-[#C89B3C]">{balance}</span>
            </div>
            <button type="button" onClick={onClose} className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition-colors shadow-sm">
              <ChevronDown className="w-5 h-5 text-[#6B4226]/60" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#6B4226]/40" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Gift className="w-10 h-10 text-[#6B4226]/20 mx-auto" />
              <p className="text-sm text-[#6B4226]/50">Henüz ödül eklenmemiş.</p>
            </div>
          ) : (
            items.map((item) => {
              const canAfford = balance >= item.cost_points;
              const outOfStock = item.stock !== -1 && item.stock <= 0;
              const justRedeemed = redeemSuccess === item.id;

              return (
                <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DF]">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 shrink-0 rounded-xl bg-gradient-to-br from-[#C89B3C]/10 to-[#6B4226]/10 flex items-center justify-center">
                      <Gift className="w-6 h-6 text-[#C89B3C]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#3D2C1E] truncate">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-[#6B4226]/50 truncate">{item.description}</p>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3 text-[#C89B3C] fill-[#C89B3C]" />
                        <span className="text-xs font-bold text-[#C89B3C]">{item.cost_points} puan</span>
                        {item.stock > 0 && item.stock !== -1 && (
                          <span className="text-[10px] text-[#6B4226]/40 ml-1">({item.stock} kaldı)</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!canAfford || outOfStock || redeeming === item.id || justRedeemed}
                      onClick={() => handleRedeem(item)}
                      className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        justRedeemed
                          ? "bg-[#4CAF50]/10 text-[#4CAF50] border border-[#4CAF50]/20"
                          : canAfford && !outOfStock
                            ? "bg-[#C89B3C] text-white hover:bg-[#B8892F] active:scale-95 shadow-sm"
                            : "bg-[#E8E4DF] text-[#6B4226]/30 cursor-not-allowed"
                      }`}
                    >
                      {redeeming === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : justRedeemed ? (
                        "✓ Alındı"
                      ) : outOfStock ? (
                        "Tükendi"
                      ) : (
                        "Al"
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
