"use client";

import { useState, useEffect } from "react";
import type { Restaurant } from "@/types";
import type { DbLoyaltyProgram, RewardPoolItem } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Award, Loader2, Save, Sparkles, Flame, Zap, Gift, Store, Users, Plus, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PointStoreItem } from "@/types";

interface Props {
  restaurant: Restaurant;
}

const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export function AdminLoyalty({ restaurant }: Props) {
  const [program, setProgram] = useState<DbLoyaltyProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [targetCount, setTargetCount] = useState(10);
  const [rewardType, setRewardType] = useState<"free_item" | "discount_percent" | "discount_amount">("free_item");
  const [rewardValue, setRewardValue] = useState(0);
  const [template, setTemplate] = useState(
    "Tebrikler! {{threshold}} siparişi tamamladınız. {{reward}} kazandınız!"
  );
  const [initialMin, setInitialMin] = useState(0);
  const [initialMax, setInitialMax] = useState(0);
  const [nearThreshold, setNearThreshold] = useState(3);
  const [happyHourEnabled, setHappyHourEnabled] = useState(false);
  const [happyHourStart, setHappyHourStart] = useState("14:00");
  const [happyHourEnd, setHappyHourEnd] = useState("16:00");
  const [happyHourDays, setHappyHourDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [happyHourMultiplier, setHappyHourMultiplier] = useState(2);
  const [rewardExpiryDays, setRewardExpiryDays] = useState(30);
  const [upsellEnabled, setUpsellEnabled] = useState(false);
  const [clubName, setClubName] = useState("Coffee Club");
  const [rewardItemName, setRewardItemName] = useState("");
  const [rewardItemId, setRewardItemId] = useState<string | null>(null);
  // Engagement Engine
  const [streakBonusEnabled, setStreakBonusEnabled] = useState(false);
  const [streakBonusThreshold, setStreakBonusThreshold] = useState(3);
  const [streakBonusMultiplier, setStreakBonusMultiplier] = useState(2);
  const [inactivityTriggerDays, setInactivityTriggerDays] = useState(3);
  const [inactivityBonusMultiplier, setInactivityBonusMultiplier] = useState(2);
  const [secretRewardEnabled, setSecretRewardEnabled] = useState(false);
  const [secretRewardProbability, setSecretRewardProbability] = useState(5);
  const [secretRewardDiscount, setSecretRewardDiscount] = useState(10);
  // Points & Store
  const [pointsEnabled, setPointsEnabled] = useState(false);
  const [pwaInstallPoints, setPwaInstallPoints] = useState(50);
  const [socialSharePoints, setSocialSharePoints] = useState(20);
  const [reviewPoints, setReviewPoints] = useState(30);
  const [orderPointsPerItem, setOrderPointsPerItem] = useState(10);
  const [storeItems, setStoreItems] = useState<PointStoreItem[]>([]);
  const [storeLoading, setStoreLoading] = useState(false);
  // Referral
  const [referralEnabled, setReferralEnabled] = useState(false);
  const [referralPoints, setReferralPoints] = useState(100);
  const [refereeBonusPoints, setRefereeBonusPoints] = useState(50);  // Reward pool
  const [rewardPool, setRewardPool] = useState<RewardPoolItem[]>([]);
  const [poolSearch, setPoolSearch] = useState("");
  // Admin tab
  const [activeAdminTab, setActiveAdminTab] = useState("basic");
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .single();

      if (data) {
        const p = data as DbLoyaltyProgram;
        setProgram(p);
        setEnabled(p.enabled);
        setTargetCount(p.target_count);
        setRewardType(p.reward_type);
        setRewardValue(p.reward_value);
        setTemplate(p.message_template || template);
        setInitialMin(p.initial_progress_min);
        setInitialMax(p.initial_progress_max);
        setNearThreshold(p.near_completion_threshold);
        setHappyHourEnabled(p.happy_hour_enabled);
        setHappyHourStart(p.happy_hour_start || "14:00");
        setHappyHourEnd(p.happy_hour_end || "16:00");
        setHappyHourDays(p.happy_hour_days || [1, 2, 3, 4, 5]);
        setHappyHourMultiplier(p.happy_hour_multiplier);
        setRewardExpiryDays(p.reward_expiry_days);
        setUpsellEnabled(p.upsell_enabled);
        setClubName(p.club_name || "Coffee Club");
        setRewardItemName(p.reward_item_name || "");
        setRewardItemId(p.reward_item_id || null);
        // Engagement Engine
        setStreakBonusEnabled(p.streak_bonus_enabled);
        setStreakBonusThreshold(p.streak_bonus_threshold);
        setStreakBonusMultiplier(p.streak_bonus_multiplier);
        setInactivityTriggerDays(p.inactivity_trigger_days);
        setInactivityBonusMultiplier(p.inactivity_bonus_multiplier);
        setSecretRewardEnabled(p.secret_reward_enabled);
        setSecretRewardProbability(Math.round(p.secret_reward_probability * 100));
        setSecretRewardDiscount(p.secret_reward_discount_percent);
        // Points & Referral
        setPointsEnabled(p.points_enabled ?? false);
        setPwaInstallPoints(p.pwa_install_points ?? 50);
        setSocialSharePoints(p.social_share_points ?? 20);
        setReviewPoints(p.review_points ?? 30);
        setOrderPointsPerItem(p.order_points_per_item ?? 10);
        setReferralEnabled(p.referral_enabled ?? false);
        setReferralPoints(p.referral_points ?? 100);
        setRefereeBonusPoints(p.referee_bonus_points ?? 50);
        setRewardPool((p.reward_pool as RewardPoolItem[]) ?? []);
      }
      // Load store items
      const { data: items } = await supabase
        .from("point_store_items")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (items) setStoreItems(items as PointStoreItem[]);
      setLoading(false);
    }
    load();
  }, [restaurant.id]);

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();

    const payload = {
      restaurant_id: restaurant.id,
      enabled,
      target_count: targetCount,
      reward_type: rewardType,
      reward_value: rewardValue,
      message_template: template,
      initial_progress_min: initialMin,
      initial_progress_max: initialMax,
      near_completion_threshold: nearThreshold,
      happy_hour_enabled: happyHourEnabled,
      happy_hour_start: happyHourEnabled ? happyHourStart : null,
      happy_hour_end: happyHourEnabled ? happyHourEnd : null,
      happy_hour_days: happyHourEnabled ? happyHourDays : [],
      happy_hour_multiplier: happyHourMultiplier,
      reward_expiry_days: rewardExpiryDays,
      upsell_enabled: upsellEnabled,
      club_name: clubName,
      reward_item_name: rewardItemName || null,
      reward_item_id: rewardItemId || null,
      // Engagement Engine
      streak_bonus_enabled: streakBonusEnabled,
      streak_bonus_threshold: streakBonusThreshold,
      streak_bonus_multiplier: streakBonusMultiplier,
      inactivity_trigger_days: inactivityTriggerDays,
      inactivity_bonus_multiplier: inactivityBonusMultiplier,
      secret_reward_enabled: secretRewardEnabled,
      secret_reward_probability: secretRewardProbability / 100,
      secret_reward_discount_percent: secretRewardDiscount,
      // Points & Referral
      points_enabled: pointsEnabled,
      pwa_install_points: pwaInstallPoints,
      social_share_points: socialSharePoints,
      review_points: reviewPoints,
      order_points_per_item: orderPointsPerItem,
      referral_enabled: referralEnabled,
      referral_points: referralPoints,
      referee_bonus_points: refereeBonusPoints,
      // Reward pool
      reward_pool: rewardPool,
    };

    let error: unknown;
    if (program) {
      const result = await supabase
        .from("loyalty_programs")
        .update(payload)
        .eq("id", program.id);
      error = result.error;
    } else {
      const result = await supabase
        .from("loyalty_programs")
        .insert(payload);
      error = result.error;
    }

    setSaving(false);

    if (error) {
      toast({ title: "Hata", description: "Kayıt başarısız", variant: "destructive" });
    } else {
      toast({ title: "Kaydedildi", description: "Sadakat ayarları güncellendi" });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const rewardLabel =
    rewardType === "free_item"
      ? "Ücretsiz Ürün"
      : rewardType === "discount_percent"
        ? `%${rewardValue} İndirim`
        : `₺${rewardValue} İndirim`;

  const toggleDay = (day: number) => {
    setHappyHourDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  /* ─── Store Item CRUD ─── */
  const addStoreItem = async () => {
    setStoreLoading(true);
    const res = await fetch("/api/loyalty/store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId: restaurant.id,
        item: { name: "Yeni Ödül", cost_points: 100 },
      }),
    });
    const json = await res.json();
    if (json.item) setStoreItems((prev) => [...prev, json.item]);
    setStoreLoading(false);
  };

  const updateStoreItem = async (item: PointStoreItem) => {
    await fetch("/api/loyalty/store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId: restaurant.id, item }),
    });
  };

  const deleteStoreItem = async (id: string) => {
    await fetch(`/api/loyalty/store?id=${id}&restaurantId=${restaurant.id}`, { method: "DELETE" });
    setStoreItems((prev) => prev.filter((i) => i.id !== id));
  };

  /* ─── Reward Pool helpers ─── */
  const addToPool = (item: RewardPoolItem) => {
    if (rewardPool.some((p) => p.menuItemId === item.menuItemId)) return;
    setRewardPool((prev) => [...prev, item]);
  };

  const removeFromPool = (menuItemId: string) => {
    setRewardPool((prev) => prev.filter((p) => p.menuItemId !== menuItemId));
  };

  const filteredProducts = restaurant.products.filter((p) =>
    p.name.toLowerCase().includes(poolSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Award className="w-5 h-5" /> Sadakat Programı
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Müşterilerinize her {targetCount}. siparişte ödül verin.
        </p>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg border">
        <div>
          <p className="font-medium">Sadakat Programı</p>
          <p className="text-sm text-muted-foreground">
            {enabled ? "Aktif — müşteriler puan kazanıyor" : "Pasif"}
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {enabled && (
        <Tabs value={activeAdminTab} onValueChange={setActiveAdminTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="basic">Temel</TabsTrigger>
            <TabsTrigger value="rewards">Ödül &amp; Mağaza</TabsTrigger>
            <TabsTrigger value="advanced">Gelişmiş</TabsTrigger>
          </TabsList>

          {/* ─────────── TAB 1: Temel ─────────── */}
          <TabsContent value="basic" className="space-y-4">
            {/* Club Name */}
            <div>
              <Label>Kulüp Adı</Label>
              <Input
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                placeholder="Coffee Club"
                className="mt-1 w-64"
              />
              <p className="text-xs text-muted-foreground mt-1">Müşterilere gösterilen sadakat kulübü adı.</p>
            </div>

            {/* Target Count */}
            <div>
              <Label>Ödül Eşiği (sipariş sayısı)</Label>
              <Input
                type="number"
                min={2}
                max={50}
                value={targetCount}
                onChange={(e) => setTargetCount(Number(e.target.value))}
                className="mt-1 w-32"
              />
              <p className="text-xs text-muted-foreground mt-1">Her {targetCount}. siparişte ödül kazanılır.</p>
            </div>

            {/* Reward Type */}
            <div>
              <Label>Ödül Türü</Label>
              <Select value={rewardType} onValueChange={(v) => setRewardType(v as typeof rewardType)}>
                <SelectTrigger className="mt-1 w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free_item">Ücretsiz Ürün</SelectItem>
                  <SelectItem value="discount_percent">Yüzde İndirim (%)</SelectItem>
                  <SelectItem value="discount_amount">Tutar İndirim (₺)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reward Value */}
            {rewardType !== "free_item" && (
              <div>
                <Label>{rewardType === "discount_percent" ? "İndirim Yüzdesi (%)" : "İndirim Tutarı (₺)"}</Label>
                <Input
                  type="number"
                  min={1}
                  value={rewardValue}
                  onChange={(e) => setRewardValue(Number(e.target.value))}
                  className="mt-1 w-32"
                />
              </div>
            )}

            {/* Initial Progress Range */}
            <div className="p-4 rounded-lg border space-y-2">
              <Label>Başlangıç Puanı Aralığı</Label>
              <p className="text-xs text-muted-foreground">Yeni müşterilere rastgele başlangıç puanı verilir (motivasyon).</p>
              <div className="flex items-center gap-2">
                <Input type="number" min={0} max={targetCount - 1} value={initialMin} onChange={(e) => setInitialMin(Number(e.target.value))} className="w-20" />
                <span className="text-sm text-muted-foreground">—</span>
                <Input type="number" min={0} max={targetCount - 1} value={initialMax} onChange={(e) => setInitialMax(Number(e.target.value))} className="w-20" />
              </div>
            </div>

            {/* Near Completion Threshold */}
            <div>
              <Label>Yaklaşma Uyarı Eşiği</Label>
              <Input
                type="number"
                min={1}
                max={targetCount}
                value={nearThreshold}
                onChange={(e) => setNearThreshold(Number(e.target.value))}
                className="mt-1 w-32"
              />
              <p className="text-xs text-muted-foreground mt-1">Ödüle {nearThreshold} sipariş kala uyarı gösterilir.</p>
            </div>

            {/* Happy Hour */}
            <div className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <Label className="cursor-pointer">Happy Hour</Label>
                  <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">PRO</span>
                </div>
                <Switch checked={happyHourEnabled} onCheckedChange={setHappyHourEnabled} />
              </div>
              {happyHourEnabled && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <div>
                      <Label className="text-xs">Başlangıç</Label>
                      <Input type="time" value={happyHourStart} onChange={(e) => setHappyHourStart(e.target.value)} className="w-28 mt-0.5" />
                    </div>
                    <span className="text-muted-foreground mt-5">—</span>
                    <div>
                      <Label className="text-xs">Bitiş</Label>
                      <Input type="time" value={happyHourEnd} onChange={(e) => setHappyHourEnd(e.target.value)} className="w-28 mt-0.5" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Çarpan</Label>
                    <Select value={String(happyHourMultiplier)} onValueChange={(v) => setHappyHourMultiplier(Number(v))}>
                      <SelectTrigger className="w-24 mt-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2x</SelectItem>
                        <SelectItem value="3">3x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Günler</Label>
                    <div className="flex gap-1">
                      {DAYS.map((label, i) => (
                        <button key={i} type="button" onClick={() => toggleDay(i + 1)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            happyHourDays.includes(i + 1) ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Upsell */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">Akıllı Upsell</p>
                <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">PRO</span>
              </div>
              <Switch checked={upsellEnabled} onCheckedChange={setUpsellEnabled} />
            </div>

            {/* Reward Expiry */}
            <div>
              <Label>Ödül Geçerlilik Süresi (gün)</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={rewardExpiryDays}
                onChange={(e) => setRewardExpiryDays(Number(e.target.value))}
                className="mt-1 w-32"
              />
              <p className="text-xs text-muted-foreground mt-1">Ödül kazanıldıktan sonra {rewardExpiryDays} gün içinde kullanılmalıdır.</p>
            </div>

            {/* Preview */}
            <div className="p-4 rounded-lg border bg-primary/5">
              <p className="text-sm font-medium mb-1">Ödül Özeti</p>
              <p className="text-sm text-muted-foreground">
                Her <strong>{targetCount}</strong> siparişte → <strong>{rewardLabel}</strong>
              </p>
              {initialMax > 0 && (
                <p className="text-xs text-muted-foreground mt-1">Yeni müşteriler {initialMin}–{initialMax} puanla başlar.</p>
              )}
            </div>

            {/* Message Template */}
            <div>
              <Label>Bildirim Mesajı Şablonu</Label>
              <Textarea value={template} onChange={(e) => setTemplate(e.target.value)} className="mt-1" rows={3} />
              <p className="text-xs text-muted-foreground mt-1">
                Kullanılabilir değişkenler: {"{{name}}"}, {"{{threshold}}"}, {"{{reward}}"}
              </p>
            </div>
          </TabsContent>

          {/* ─────────── TAB 2: Ödül & Mağaza ─────────── */}
          <TabsContent value="rewards" className="space-y-4">
            {/* Reward Item — pick from menu */}
            <div>
              <Label>Varsayılan Ödül Ürünü</Label>
              <Select value={rewardItemId || ""} onValueChange={(v) => {
                setRewardItemId(v || null);
                const product = restaurant.products.find((p) => p.id === v);
                if (product) setRewardItemName(product.name);
              }}>
                <SelectTrigger className="mt-1 w-80">
                  <SelectValue placeholder="Menüden ürün seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {restaurant.products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Sipariş tamamlandığında bu ürün sepete ücretsiz eklenecek.</p>
            </div>

            {/* Reward Item Name Override */}
            <div>
              <Label>Ödül Ürün Adı (Geçersiz Kılma)</Label>
              <Input
                value={rewardItemName}
                onChange={(e) => setRewardItemName(e.target.value)}
                placeholder="Otomatik (menü ürün adı kullanılır)"
                className="mt-1 w-64"
              />
              <p className="text-xs text-muted-foreground mt-1">Boş bırakılırsa menüdeki ödül ürün adı kullanılır.</p>
            </div>

            {/* Reward Pool */}
            <div className="p-4 rounded-lg border space-y-3">
              <div>
                <p className="text-sm font-semibold flex items-center gap-2 mb-1">
                  <Gift className="w-4 h-4 text-amber-600" /> Ödül Havuzu
                </p>
                <p className="text-xs text-muted-foreground">
                  Müşteri ödülünü kullanırken bu listedeki ürünlerden birini seçer. Boşsa tek ürün modu.
                </p>
              </div>

              {/* Current pool */}
              {rewardPool.length > 0 && (
                <div className="space-y-2">
                  {rewardPool.map((item) => (
                    <div key={item.menuItemId} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border">
                      <span className="text-sm flex-1 truncate">{item.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeFromPool(item.menuItemId)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add from menu products */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Menüde ara..."
                    value={poolSearch}
                    onChange={(e) => setPoolSearch(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
                {poolSearch && (
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-3 py-2">Ürün bulunamadı</p>
                    ) : (
                      filteredProducts.slice(0, 10).map((p) => {
                        const inPool = rewardPool.some((r) => r.menuItemId === p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            disabled={inPool}
                            onClick={() => { addToPool({ menuItemId: p.id, name: p.name, image: p.image || undefined }); setPoolSearch(""); }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            <span className="truncate">{p.name}</span>
                            {inPool ? (
                              <span className="text-xs text-muted-foreground shrink-0 ml-2">Ekli</span>
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Point Store */}
            <div className="pt-2 border-t">
              <h3 className="text-base font-bold flex items-center gap-2 mb-4">
                <Store className="w-4 h-4 text-blue-600" /> Puan Mağazası
              </h3>

              <div className="flex items-center justify-between p-4 rounded-lg border mb-4">
                <div>
                  <p className="font-medium text-sm">Puan Sistemi</p>
                  <p className="text-xs text-muted-foreground">Müşteriler aksiyonlarla puan kazanır, mağazadan ödül alır.</p>
                </div>
                <Switch checked={pointsEnabled} onCheckedChange={setPointsEnabled} />
              </div>

              {pointsEnabled && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border space-y-3">
                    <p className="text-sm font-medium">Puan Kazanma Değerleri</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Sipariş başına</Label>
                        <Input type="number" min={0} value={orderPointsPerItem} onChange={(e) => setOrderPointsPerItem(Number(e.target.value))} className="w-24 mt-0.5" />
                      </div>
                      <div>
                        <Label className="text-xs">PWA yükleme</Label>
                        <Input type="number" min={0} value={pwaInstallPoints} onChange={(e) => setPwaInstallPoints(Number(e.target.value))} className="w-24 mt-0.5" />
                      </div>
                      <div>
                        <Label className="text-xs">Sosyal paylaşım</Label>
                        <Input type="number" min={0} value={socialSharePoints} onChange={(e) => setSocialSharePoints(Number(e.target.value))} className="w-24 mt-0.5" />
                      </div>
                      <div>
                        <Label className="text-xs">Yorum bırakma</Label>
                        <Input type="number" min={0} value={reviewPoints} onChange={(e) => setReviewPoints(Number(e.target.value))} className="w-24 mt-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Mağaza Ödülleri</p>
                      <Button variant="outline" size="sm" onClick={addStoreItem} disabled={storeLoading}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Ekle
                      </Button>
                    </div>
                    {storeItems.length === 0 && (
                      <p className="text-xs text-muted-foreground py-3 text-center">Henüz mağaza ödülü eklenmemiş.</p>
                    )}
                    {storeItems.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                        <div className="flex-1 space-y-2">
                          <Input
                            value={item.name}
                            onChange={(e) => { const u = [...storeItems]; u[idx] = { ...u[idx], name: e.target.value }; setStoreItems(u); }}
                            onBlur={() => updateStoreItem(storeItems[idx])}
                            placeholder="Ödül adı"
                            className="h-8 text-sm"
                          />
                          <div>
                            <Label className="text-[10px]">Bağlı Menü Ürünü</Label>
                            <Select value={item.menu_item_id || ""} onValueChange={(v) => {
                              const u = [...storeItems];
                              const product = restaurant.products.find((p) => p.id === v);
                              u[idx] = { ...u[idx], menu_item_id: v || null, name: product?.name || u[idx].name, image_url: product?.image || u[idx].image_url };
                              setStoreItems(u);
                              updateStoreItem(u[idx]);
                            }}>
                              <SelectTrigger className="h-8 text-sm mt-0.5">
                                <SelectValue placeholder="Menüden ürün seçin..." />
                              </SelectTrigger>
                              <SelectContent>
                                {restaurant.products.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <Label className="text-[10px]">Puan</Label>
                              <Input type="number" min={1} value={item.cost_points}
                                onChange={(e) => { const u = [...storeItems]; u[idx] = { ...u[idx], cost_points: Number(e.target.value) }; setStoreItems(u); }}
                                onBlur={() => updateStoreItem(storeItems[idx])} className="h-8 w-20 text-sm" />
                            </div>
                            <div className="flex-1">
                              <Label className="text-[10px]">Stok (-1=sınırsız)</Label>
                              <Input type="number" min={-1} value={item.stock}
                                onChange={(e) => { const u = [...storeItems]; u[idx] = { ...u[idx], stock: Number(e.target.value) }; setStoreItems(u); }}
                                onBlur={() => updateStoreItem(storeItems[idx])} className="h-8 w-20 text-sm" />
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteStoreItem(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Referral */}
            <div className="pt-2 border-t">
              <h3 className="text-base font-bold flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-green-600" /> Davet Sistemi
              </h3>
              <div className="flex items-center justify-between p-4 rounded-lg border mb-4">
                <div>
                  <p className="font-medium text-sm">Davet Sistemi</p>
                  <p className="text-xs text-muted-foreground">Müşteriler arkadaşlarını davet ederek puan kazansın.</p>
                </div>
                <Switch checked={referralEnabled} onCheckedChange={setReferralEnabled} />
              </div>
              {referralEnabled && (
                <div className="p-4 rounded-lg border space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Davet eden puan</Label>
                      <Input type="number" min={0} value={referralPoints} onChange={(e) => setReferralPoints(Number(e.target.value))} className="w-24 mt-0.5" />
                      <p className="text-[10px] text-muted-foreground mt-0.5">Davet eden kişiye verilir.</p>
                    </div>
                    <div>
                      <Label className="text-xs">Davet edilen puan</Label>
                      <Input type="number" min={0} value={refereeBonusPoints} onChange={(e) => setRefereeBonusPoints(Number(e.target.value))} className="w-24 mt-0.5" />
                      <p className="text-[10px] text-muted-foreground mt-0.5">Yeni müşteriye hoş geldin puanı.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ─────────── TAB 3: Gelişmiş ─────────── */}
          <TabsContent value="advanced" className="space-y-4">
            <h3 className="text-base font-bold flex items-center gap-2 mb-2">🚀 Engagement Engine</h3>

            {/* Streak Bonus */}
            <div className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <Label className="cursor-pointer">Streak Bonusu</Label>
                  <span className="text-[10px] font-semibold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-full">PRO</span>
                </div>
                <Switch checked={streakBonusEnabled} onCheckedChange={setStreakBonusEnabled} />
              </div>
              <p className="text-xs text-muted-foreground">Üst üste gelen müşterilere bonus çarpan verin.</p>
              {streakBonusEnabled && (
                <div className="space-y-3 pt-2">
                  <div>
                    <Label className="text-xs">Kaç gün streak sonrası?</Label>
                    <Input type="number" min={2} max={30} value={streakBonusThreshold} onChange={(e) => setStreakBonusThreshold(Number(e.target.value))} className="w-24 mt-0.5" />
                    <p className="text-xs text-muted-foreground mt-1">{streakBonusThreshold} gün üst üste gelince çarpan aktif olur.</p>
                  </div>
                  <div>
                    <Label className="text-xs">Çarpan</Label>
                    <Select value={String(streakBonusMultiplier)} onValueChange={(v) => setStreakBonusMultiplier(Number(v))}>
                      <SelectTrigger className="w-24 mt-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2x</SelectItem>
                        <SelectItem value="3">3x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Inactivity Trigger */}
            <div className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-500" />
                <Label>Hareketsizlik Tetikleyicisi</Label>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">PRO</span>
              </div>
              <p className="text-xs text-muted-foreground">Uzun süredir gelmeyen müşterilere bonus verin.</p>
              <div className="flex items-center gap-3">
                <div>
                  <Label className="text-xs">Kaç gün sonra?</Label>
                  <Input type="number" min={1} max={30} value={inactivityTriggerDays} onChange={(e) => setInactivityTriggerDays(Number(e.target.value))} className="w-24 mt-0.5" />
                </div>
                <div>
                  <Label className="text-xs">Bonus Çarpanı</Label>
                  <Select value={String(inactivityBonusMultiplier)} onValueChange={(v) => setInactivityBonusMultiplier(Number(v))}>
                    <SelectTrigger className="w-24 mt-0.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2x</SelectItem>
                      <SelectItem value="3">3x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {inactivityTriggerDays} gün gelmezse, tekrar geldiğinde {inactivityBonusMultiplier}x bonus kazanır (24 saat geçerli).
              </p>
            </div>

            {/* Secret Reward */}
            <div className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-violet-500" />
                  <Label className="cursor-pointer">Gizli Ödül</Label>
                  <span className="text-[10px] font-semibold text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded-full">PRO</span>
                </div>
                <Switch checked={secretRewardEnabled} onCheckedChange={setSecretRewardEnabled} />
              </div>
              <p className="text-xs text-muted-foreground">Şanslı müşterilere rastgele indirim kuponu düşürün.</p>
              {secretRewardEnabled && (
                <div className="space-y-3 pt-2">
                  <div>
                    <Label className="text-xs">Olasılık (%)</Label>
                    <Input type="number" min={1} max={50} value={secretRewardProbability} onChange={(e) => setSecretRewardProbability(Number(e.target.value))} className="w-24 mt-0.5" />
                    <p className="text-xs text-muted-foreground mt-1">Her siparişte %{secretRewardProbability} şansla gizli ödül düşer.</p>
                  </div>
                  <div>
                    <Label className="text-xs">İndirim Yüzdesi (%)</Label>
                    <Input type="number" min={5} max={50} value={secretRewardDiscount} onChange={(e) => setSecretRewardDiscount(Number(e.target.value))} className="w-24 mt-0.5" />
                    <p className="text-xs text-muted-foreground mt-1">Kazanan müşteri %{secretRewardDiscount} indirim kuponu alır (7 gün geçerli).</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Save */}
      <Button onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Kaydet
      </Button>
    </div>
  );
}
