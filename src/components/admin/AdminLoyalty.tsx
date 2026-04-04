"use client";

import { useState, useEffect } from "react";
import type { Restaurant } from "@/types";
import type { DbLoyaltyConfig } from "@/types";
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
import { Award, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  restaurant: Restaurant;
}

export function AdminLoyalty({ restaurant }: Props) {
  const [config, setConfig] = useState<DbLoyaltyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(10);
  const [rewardType, setRewardType] = useState<"free_item" | "discount_percent" | "discount_amount">("free_item");
  const [rewardValue, setRewardValue] = useState(0);
  const [template, setTemplate] = useState(
    "Tebrikler {{name}}! {{threshold}} siparişi tamamladınız. {{reward}} kazandınız!"
  );

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("loyalty_config")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .single();

      if (data) {
        setConfig(data as DbLoyaltyConfig);
        setEnabled(data.enabled);
        setThreshold(data.reward_threshold);
        setRewardType(data.reward_type);
        setRewardValue(data.reward_value);
        setTemplate(data.message_template || template);
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
      reward_threshold: threshold,
      reward_type: rewardType,
      reward_value: rewardValue,
      message_template: template,
    };

    let error: unknown;
    if (config) {
      const result = await supabase
        .from("loyalty_config")
        .update(payload)
        .eq("id", config.id);
      error = result.error;
    } else {
      const result = await supabase
        .from("loyalty_config")
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

  return (
    <div className="space-y-6 max-w-lg">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Award className="w-5 h-5" /> Sadakat Programı
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Müşterilerinize her {threshold}. siparişte ödül verin.
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
          {/* Threshold */}
          <div>
            <Label>Ödül Eşiği (sipariş sayısı)</Label>
            <Input
              type="number"
              min={2}
              max={50}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="mt-1 w-32"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Her {threshold}. siparişte ödül kazanılır.
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

          {/* Preview */}
          <div className="p-4 rounded-lg border bg-primary/5">
            <p className="text-sm font-medium mb-1">Ödül Özeti</p>
            <p className="text-sm text-muted-foreground">
              Her <strong>{threshold}</strong> siparişte → <strong>{rewardLabel}</strong>
            </p>
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
