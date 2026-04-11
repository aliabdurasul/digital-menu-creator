"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Restaurant, ModuleType } from "@/types";
import type { OrderStatus, OrderWithItems, LoyaltyResult } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  ChefHat,
  CheckCircle2,
  Truck,
  XCircle,
  Loader2,
  Volume2,
  VolumeX,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminOrdersProps {
  restaurant: Restaurant;
  moduleType?: ModuleType;
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; icon: React.ElementType; bg: string }
> = {
  pending: { label: "Bekliyor", color: "text-yellow-600", icon: Clock, bg: "bg-yellow-50 border-yellow-200" },
  preparing: { label: "Hazırlanıyor", color: "text-blue-600", icon: ChefHat, bg: "bg-blue-50 border-blue-200" },
  ready: { label: "Hazır", color: "text-green-600", icon: CheckCircle2, bg: "bg-green-50 border-green-200" },
  delivered: { label: "Teslim Edildi", color: "text-gray-600", icon: Truck, bg: "bg-gray-50 border-gray-200" },
  cancelled: { label: "İptal", color: "text-red-600", icon: XCircle, bg: "bg-red-50 border-red-200" },
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "preparing",
  preparing: "ready",
  ready: "delivered",
};

export function AdminOrders({ restaurant, moduleType = "restaurant" }: AdminOrdersProps) {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*), restaurant_tables(label)")
      .eq("restaurant_id", restaurant.id)
      .in("status", ["pending", "preparing", "ready"])
      .order("created_at", { ascending: false });

    const mapped = (data || []).map((o: Record<string, unknown>) => ({
      ...o,
      items: (o.order_items as unknown[]) || [],
      table: o.restaurant_tables || undefined,
    })) as (OrderWithItems & { customer_name?: string })[];

    setOrders(mapped);
    setLoading(false);
  }, [restaurant.id]);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            // Play notification sound
            if (soundEnabled && audioRef.current) {
              audioRef.current.play().catch(() => {});
            }
            toast({ title: "Yeni sipariş geldi!" });
            fetchOrders();
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as { id: string; status: string; loyalty_reward_earned?: boolean; loyalty_reward_message?: string; customer_name?: string };
            const old = payload.old as { loyalty_reward_earned?: boolean } | undefined;

            // Loyalty reward detected via Realtime (other admins watching)
            if (updated.loyalty_reward_earned && !old?.loyalty_reward_earned) {
              if (soundEnabled && audioRef.current) {
                audioRef.current.play().catch(() => {});
              }
              toast({
                title: "🎉 Sadakat Ödülü!",
                description: updated.loyalty_reward_message || "Müşteri sadakat ödülü kazandı!",
              });
            }

            // If moved to delivered/cancelled → remove from active list
            if (!["pending", "preparing", "ready"].includes(updated.status)) {
              setOrders((prev) => prev.filter((o) => o.id !== updated.id));
            } else {
              // Still active — update in place
              setOrders((prev) =>
                prev.map((o) =>
                  o.id === updated.id ? { ...o, ...(payload.new as object) } : o
                )
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant.id, soundEnabled, fetchOrders, toast]);

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Güncelleme başarısız");
      }

      const resData = (await res.json().catch(() => ({}))) as { loyalty?: LoyaltyResult };

      // Show loyalty reward toast to the admin who clicked "Delivered"
      if (resData.loyalty?.rewarded) {
        const order = orders.find((o) => o.id === orderId);
        const name = (order as OrderWithItems & { customer_name?: string })?.customer_name || "Müşteri";
        toast({
          title: "🎉 Sadakat Ödülü!",
          description: `${name} sadakat ödülü kazandı! ${resData.loyalty.rewardMessage || ""}`,
        });
      }

      // If delivered/cancelled → remove from list immediately
      if (!["pending", "preparing", "ready"].includes(newStatus)) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
      }
    } catch (err) {
      toast({
        title: "Hata",
        description: err instanceof Error ? err.message : "Bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const cancelOrder = async (orderId: string) => {
    await updateStatus(orderId, "cancelled");
  };

  const activeStatuses: OrderStatus[] = ["pending", "preparing", "ready"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification sound (simple beep) */}
      <audio ref={audioRef} preload="auto">
        <source
          src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgipuurJ9jNjhkjK2sq5xhNTdikqqsrJ5iNzlllKutrJ9jODpnlqytrZ9kOTpomK2trqBkOjlpmq6urqBkOzpqm6+ur59kPDtrna+vrp9lPTxsnq+vr55kPTxsn7Cwr55lPjxtoLCwr55mPjxtobGxr59lPzxuorGxr59mQDxuo7Gxr59mQD1vpLKysp9nQT1vpbKysqBnQT1vpbKzs6BoQj1vpbK0tKFoQj5wpbO0tKFpQz5xprO0tKFpQz5xprO0taJpRD5xp7S1taJqRD9yp7S1taJqRD9yqLS2tqNqRT9yqLS2tqNrRj9zqbS2tqNrRj9zqbW3t6RsRz90qrW3t6RsRz90qrW3t6RsSD90q7a4uKVtSEB1q7a4uKVtSUB1rLa4uKVtSUB1rLa4uaZuSkF2rbe5uaZuSkF2rbe5uaZuS0F2rbe5uqdvS0J3rri6uqdvTEJ3r7i6u6hvTEJ3r7i6u6hvTUN4sLm7u6hwTUN4sLm7u6hwTkN4sbm7vKlwTkR5sbq8vKlxT0R5srq8vKlxT0V6srq8vakAUEV6s7u9valxUEV6s7u9valxUUZ7tLu9vqpyUUZ7tLy+vqpyUkZ7tby+v6tyUkd8tby+v6tyU0d8try/v6xzU0d8try/v6xzVEh9t72/wKxzVEh9t72/wK10VUh9uL3AwK10VUl+uL7Awa10Vkl+ub7Awa50Vkl+ub7Bwq50V0p/ur/Bwq50V0p/ur/Bwq91WEp/u7/Cwq91WEp/u7/Cw691WUuAvMDCw692WUuAvMDDxK92WkuAvMDDxK92WkuBvcHDxK92W0yBvcHExbB3W0yBvsLExbB3XEyCvsLExbF3XEyCvsLFxrF3XU2Cv8LFxrF4XU2Cv8PGxrF4Xk2DwMPGxrJ4Xk2DwMPGx7J4X06DwMPHx7J5X06EwcTHx7J5YE6EwcTHyLN5YE+EwcTIyLN5YU+FwsTIyLN6YU+FwsTIyLR6Yk+Fw8XIyLR6Yk+Fw8XIybR6Y1CGw8XIybR7Y1CGw8bJybV7ZFCGxMbJybV7ZFCHxMbJyrV7ZVCHxMbKyrV7ZVGHxcfKyrZ8ZlGHxcfKyrZ8ZlGIxcfKy7Z8Z1GIxcfLy7Z8Z1KIxsjLy7d9aFKIxsjLy7d9aFKJxsjLzLd9aVKJx8jMzLd9aVOJx8jMzLh9alOJx8nMzLh+alOKx8nMzLh+a1OKyMnNzbh+a1OKyMnNzbl+bFSKyMnNzbl+bFSKyMrNzbl/bFSLyMrOzrl/bVSLycrOzrl/bVWLycrOz7p/blWLycrOz7p/blWLysrPz7qAblWMysrPz7qAb1WMysrPz7qAb1aMysvP0LuAb1aMysvP0LuAcFaMysvQ0LuAcFaMy8vQ0LuBcFeNy8vQ0buBcFeNy8vQ0buBcFeNy8zQ0byBcVeNy8zR0byBcViNzMzR0byBcViNzMzR0byCcViOzMzR0ryCcViOzMzR0ryC"
          type="audio/wav"
        />
      </audio>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">
            {moduleType === "cafe" ? "Bar Paneli" : "Aktif Siparişler"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Sadece aktif siparişler — teslim edilen ve iptal edilen siparişler otomatik kaybolur.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSoundEnabled(!soundEnabled)}>
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            <RefreshCw className="w-4 h-4 mr-2" /> Yenile
          </Button>
        </div>
      </div>

      {/* Active Orders — Kanban columns */}
      {orders.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          Şu an aktif sipariş yok.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeStatuses.map((status) => {
              const cfg = STATUS_CONFIG[status];
              const statusOrders = orders.filter((o) => o.status === status);
              return (
                <div key={status} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                    <h3 className={`font-semibold text-sm ${cfg.color}`}>
                      {cfg.label}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {statusOrders.length}
                    </Badge>
                  </div>

                  <div className="space-y-2 min-h-[80px]">
                    {statusOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        updating={updating === order.id}
                        moduleType={moduleType}
                        onAdvance={() => {
                          const next = NEXT_STATUS[order.status];
                          if (next) updateStatus(order.id, next);
                        }}
                        onCancel={() => cancelOrder(order.id)}
                      />
                    ))}
                    {statusOrders.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4 border rounded-lg border-dashed">
                        Boş
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

/* ─── Order Card ─── */
function OrderCard({
  order,
  updating,
  moduleType = "restaurant",
  onAdvance,
  onCancel,
}: {
  order: OrderWithItems & { customer_name?: string };
  updating: boolean;
  moduleType?: ModuleType;
  onAdvance?: () => void;
  onCancel?: () => void;
}) {
  const cfg = STATUS_CONFIG[order.status];
  const next = NEXT_STATUS[order.status as keyof typeof NEXT_STATUS];
  const nextCfg = next ? STATUS_CONFIG[next] : null;
  const tableLabel = order.table && "label" in order.table ? order.table.label : "Paket";
  const isCafe = moduleType === "cafe";

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${cfg.bg}`}>
      {/* Header — cafe: customer-first, restaurant: table-first */}
      {isCafe ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                {order.customer_name || "Misafir"}
              </span>
              {order.session_id?.startsWith("CAFE-") && (
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {order.session_id}
                </Badge>
              )}
            </div>
            <span className="text-sm font-bold">₺{Number(order.total).toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{tableLabel}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(order.created_at).toLocaleTimeString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              {tableLabel}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(order.created_at).toLocaleTimeString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <span className="text-sm font-bold">₺{Number(order.total).toFixed(2)}</span>
        </div>
      )}

      {/* Customer phone — only for restaurant mode */}
      {!isCafe && order.customer_phone && (
        <p className="text-xs text-muted-foreground font-mono">📱 {order.customer_phone}</p>
      )}

      {/* Items */}
      <ul className="space-y-0.5">
        {order.items.map((item) => (
          <li key={item.id} className={`flex justify-between text-xs ${item.is_loyalty_reward ? "font-semibold text-amber-700" : ""}`}>
            <span>
              {item.is_loyalty_reward ? "🎁 " : ""}{item.quantity}× {item.name_snapshot.toUpperCase()}
              {item.is_loyalty_reward && (
                <span className="ml-1 px-1 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">LOYALTY REWARD</span>
              )}
            </span>
            <span className={item.is_loyalty_reward ? "text-amber-600 font-bold" : "text-muted-foreground"}>
              {item.is_loyalty_reward ? "FREE" : `₺${(Number(item.price_snapshot) * item.quantity).toFixed(2)}`}
            </span>
          </li>
        ))}
      </ul>

      {/* Note */}
      {order.note && (
        <p className="text-xs text-muted-foreground italic">📝 {order.note}</p>
      )}

      {/* Actions */}
      {(onAdvance || onCancel) && next && (
        <div className="flex gap-2 pt-1">
          {onAdvance && nextCfg && (
            <Button
              size="sm"
              className="flex-1 h-8 text-xs"
              disabled={updating}
              onClick={onAdvance}
            >
              {updating ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <nextCfg.icon className="w-3 h-3 mr-1" />
              )}
              {nextCfg.label === "Teslim Edildi" && isCafe ? "Teslim" : nextCfg.label}
            </Button>
          )}
          {onCancel && order.status !== "ready" && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
              disabled={updating}
              onClick={onCancel}
            >
              <XCircle className="w-3 h-3 mr-1" />
              İptal
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
