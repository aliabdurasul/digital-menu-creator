"use client";

import { useState, useEffect } from "react";
import type { Restaurant } from "@/types";
import type { DbLoyaltyProgram } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Award, Loader2, Save, Sparkles, Flame, Zap, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  // Engagement Engine
  const [streakBonusEnabled, setStreakBonusEnabled] = useState(false);
  const [streakBonusThreshold, setStreakBonusThreshold] = useState(3);
  const [streakBonusMultiplier, setStreakBonusMultiplier] = useState(2);
  const [inactivityTriggerDays, setInactivityTriggerDays] = useState(3);
  const [inactivityBonusMultiplier, setInactivityBonusMultiplier] = useState(2);
  const [secretRewardEnabled, setSecretRewardEnabled] = useState(false);
  const [secretRewardProbability, setSecretRewardProbability] = useState(5);
  const [secretRewardDiscount, setSecretRewardDiscount] = useState(10);

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
        // Engagement Engine
        setStreakBonusEnabled(p.streak_bonus_enabled);
        setStreakBonusThreshold(p.streak_bonus_threshold);
        setStreakBonusMultiplier(p.streak_bonus_multiplier);
        setInactivityTriggerDays(p.inactivity_trigger_days);
        setInactivityBonusMultiplier(p.inactivity_bonus_multiplier);
        setSecretRewardEnabled(p.secret_reward_enabled);
        setSecretRewardProbability(Math.round(p.secret_reward_probability * 100));
        setSecretRewardDiscount(p.secret_reward_discount_percent);
      }
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
      // Engagement Engine
      streak_bonus_enabled: streakBonusEnabled,
      streak_bonus_threshold: streakBonusThreshold,
      streak_bonus_multiplier: streakBonusMultiplier,
      inactivity_trigger_days: inactivityTriggerDays,
      inactivity_bonus_multiplier: inactivityBonusMultiplier,
      secret_reward_enabled: secretRewardEnabled,
      secret_reward_probability: secretRewardProbability / 100,
      secret_reward_discount_percent: secretRewardDiscount,
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

  return (
    <div className="space-y-6 max-w-lg">
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
        <div className="space-y-4">
          {/* Club Name */}
          <div>
            <Label>Kulüp Adı</Label>
            <Input
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              placeholder="Coffee Club"
              className="mt-1 w-64"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Müşterilere gösterilen sadakat kulübü adı.
            </p>
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
            <p className="text-xs text-muted-foreground mt-1">
              Boş bırakılırsa menüdeki ödül ürün adı kullanılır.
            </p>
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
            <p className="text-xs text-muted-foreground mt-1">
              Her {targetCount}. siparişte ödül kazanılır.
            </p>
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
              <Label>
                {rewardType === "discount_percent" ? "İndirim Yüzdesi (%)" : "İndirim Tutarı (₺)"}
              </Label>
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
            <p className="text-xs text-muted-foreground">
              Yeni müşterilere rastgele başlangıç puanı verilir (motivasyon).
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={targetCount - 1}
                value={initialMin}
                onChange={(e) => setInitialMin(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">—</span>
              <Input
                type="number"
                min={0}
                max={targetCount - 1}
                value={initialMax}
                onChange={(e) => setInitialMax(Number(e.target.value))}
                className="w-20"
              />
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
            <p className="text-xs text-muted-foreground mt-1">
              Ödüle {nearThreshold} sipariş kala "az kaldı" uyarısı gösterilir.
            </p>
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
                    <Input
                      type="time"
                      value={happyHourStart}
                      onChange={(e) => setHappyHourStart(e.target.value)}
                      className="w-28 mt-0.5"
                    />
                  </div>
                  <span className="text-muted-foreground mt-5">—</span>
                  <div>
                    <Label className="text-xs">Bitiş</Label>
                    <Input
                      type="time"
                      value={happyHourEnd}
                      onChange={(e) => setHappyHourEnd(e.target.value)}
                      className="w-28 mt-0.5"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Çarpan</Label>
                  <Select
                    value={String(happyHourMultiplier)}
                    onValueChange={(v) => setHappyHourMultiplier(Number(v))}
                  >
                    <SelectTrigger className="w-24 mt-0.5">
                      <SelectValue />
                    </SelectTrigger>
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
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleDay(i + 1)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          happyHourDays.includes(i + 1)
                            ? "bg-purple-600 text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
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

          {/* ━━━ Engagement Engine ━━━ */}
          <div className="pt-4 border-t">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              🚀 Engagement Engine
            </h3>

            {/* Streak Bonus */}
            <div className="p-4 rounded-lg border space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <Label className="cursor-pointer">Streak Bonusu</Label>
                  <span className="text-[10px] font-semibold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-full">PRO</span>
                </div>
                <Switch checked={streakBonusEnabled} onCheckedChange={setStreakBonusEnabled} />
              </div>
              <p className="text-xs text-muted-foreground">
                Üst üste gelen müşterilere bonus çarpan verin.
              </p>

              {streakBonusEnabled && (
                <div className="space-y-3 pt-2">
                  <div>
                    <Label className="text-xs">Kaç gün streak sonrası?</Label>
                    <Input
                      type="number"
                      min={2}
                      max={30}
                      value={streakBonusThreshold}
                      onChange={(e) => setStreakBonusThreshold(Number(e.target.value))}
                      className="w-24 mt-0.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {streakBonusThreshold} gün üst üste gelince çarpan aktif olur.
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs">Çarpan</Label>
                    <Select
                      value={String(streakBonusMultiplier)}
                      onValueChange={(v) => setStreakBonusMultiplier(Number(v))}
                    >
                      <SelectTrigger className="w-24 mt-0.5">
                        <SelectValue />
                      </SelectTrigger>
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
            <div className="p-4 rounded-lg border space-y-3 mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-500" />
                <Label>Hareketsizlik Tetikleyicisi</Label>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">PRO</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Uzun süredir gelmeyen müşterilere bonus verin.
              </p>
              <div className="flex items-center gap-3">
                <div>
                  <Label className="text-xs">Kaç gün sonra?</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={inactivityTriggerDays}
                    onChange={(e) => setInactivityTriggerDays(Number(e.target.value))}
                    className="w-24 mt-0.5"
                  />
                </div>
                <div>
                  <Label className="text-xs">Bonus Çarpanı</Label>
                  <Select
                    value={String(inactivityBonusMultiplier)}
                    onValueChange={(v) => setInactivityBonusMultiplier(Number(v))}
                  >
                    <SelectTrigger className="w-24 mt-0.5">
                      <SelectValue />
                    </SelectTrigger>
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
            <div className="p-4 rounded-lg border space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-violet-500" />
                  <Label className="cursor-pointer">Gizli Ödül</Label>
                  <span className="text-[10px] font-semibold text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded-full">PRO</span>
                </div>
                <Switch checked={secretRewardEnabled} onCheckedChange={setSecretRewardEnabled} />
              </div>
              <p className="text-xs text-muted-foreground">
                Şanslı müşterilere rastgele indirim kuponu düşürün.
              </p>

              {secretRewardEnabled && (
                <div className="space-y-3 pt-2">
                  <div>
                    <Label className="text-xs">Olasılık (%)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={secretRewardProbability}
                      onChange={(e) => setSecretRewardProbability(Number(e.target.value))}
                      className="w-24 mt-0.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Her siparişte %{secretRewardProbability} şansla gizli ödül düşer.
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs">İndirim Yüzdesi (%)</Label>
                    <Input
                      type="number"
                      min={5}
                      max={50}
                      value={secretRewardDiscount}
                      onChange={(e) => setSecretRewardDiscount(Number(e.target.value))}
                      className="w-24 mt-0.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Kazanan müşteri %{secretRewardDiscount} indirim kuponu alır (7 gün geçerli).
                    </p>
                  </div>
                </div>
              )}
            </div>
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
            <p className="text-xs text-muted-foreground mt-1">
              Ödül kazanıldıktan sonra {rewardExpiryDays} gün içinde kullanılmalıdır.
            </p>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-lg border bg-primary/5">
            <p className="text-sm font-medium mb-1">Ödül Özeti</p>
            <p className="text-sm text-muted-foreground">
              Her <strong>{targetCount}</strong> siparişte → <strong>{rewardLabel}</strong>
            </p>
            {initialMax > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Yeni müşteriler {initialMin}–{initialMax} puanla başlar.
              </p>
            )}
          </div>

          {/* Message Template */}
          <div>
            <Label>Bildirim Mesajı Şablonu</Label>
            <Textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="mt-1"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Kullanılabilir değişkenler: {"{{name}}"}, {"{{threshold}}"}, {"{{reward}}"}
            </p>
          </div>
        </div>
      )}

      {/* Save */}
      <Button onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Kaydet
      </Button>
    </div>
  );
}
