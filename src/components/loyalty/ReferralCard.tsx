"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Copy, Check, Share2, Gift } from "lucide-react";
import { useLoyalty } from "@/components/menu/LoyaltyProvider";

interface ReferralData {
  enabled: boolean;
  code: string | null;
  referralCount: number;
  totalEarned: number;
  referrerPoints: number;
  refereePoints: number;
}

interface Props {
  restaurantId: string;
}

export function ReferralCard({ restaurantId }: Props) {
  const loyalty = useLoyalty();
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loyalty?.customerKey) return;
    fetch(`/api/loyalty/referral?customerKey=${loyalty.customerKey}&restaurantId=${restaurantId}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [loyalty?.customerKey, restaurantId]);

  const handleCopy = useCallback(async () => {
    if (!data?.code) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?ref=${data.code}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [data?.code]);

  const handleShare = useCallback(async () => {
    if (!data?.code || typeof navigator.share !== "function") return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?ref=${data.code}`;
    try {
      await navigator.share({
        title: "Bize katıl!",
        text: `Bu kafede sipariş ver, ${data.refereePoints} bonus puan kazan! 🎁`,
        url: shareUrl,
      });
    } catch { /* user cancelled */ }
  }, [data]);

  if (loading || !data?.enabled || !data.code) return null;

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 shadow-sm border border-emerald-100">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-emerald-600" />
        <h3 className="text-sm font-bold text-emerald-800">Arkadaşını Davet Et</h3>
      </div>

      <p className="text-xs text-emerald-700/70 mb-3">
        Arkadaşın ilk siparişini verince sen <strong>{data.referrerPoints} puan</strong>, arkadaşın <strong>{data.refereePoints} puan</strong> kazansın!
      </p>

      {/* Code display */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 bg-white rounded-xl px-4 py-2.5 border border-emerald-200 text-center">
          <span className="text-lg font-bold tracking-[0.2em] text-emerald-800">{data.code}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            copied
              ? "bg-[#4CAF50] text-white"
              : "bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 active:scale-95"
          }`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
        {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
          <button
            type="button"
            onClick={handleShare}
            className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 active:scale-95 transition-all shadow-sm"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Stats */}
      {data.referralCount > 0 && (
        <div className="flex items-center gap-3 pt-2 border-t border-emerald-100">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">{data.referralCount} davet</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Gift className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">{data.totalEarned} puan kazanıldı</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Auto-apply referral code from URL.
 * Call this on page mount. Reads ?ref=CODE and posts to API.
 */
export function useAutoReferral(restaurantId: string, customerKey: string) {
  useEffect(() => {
    if (!restaurantId || !customerKey || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("ref");
    if (!code) return;

    // Don't re-apply
    const appliedKey = `referral_applied_${restaurantId}`;
    if (localStorage.getItem(appliedKey)) return;

    fetch("/api/loyalty/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refereeKey: customerKey, restaurantId, code }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok || d.alreadyReferred) {
          localStorage.setItem(appliedKey, "true");
          // Clean URL without reload
          const url = new URL(window.location.href);
          url.searchParams.delete("ref");
          window.history.replaceState({}, "", url.toString());
        }
      })
      .catch(() => {});
  }, [restaurantId, customerKey]);
}
