"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, Save, Languages } from "lucide-react";
import type { Restaurant } from "@/types";
import {
  getRestaurantTranslations,
  getCategoryTranslations,
  getMenuItemTranslations,
  upsertRestaurantTranslation,
  upsertCategoryTranslation,
  upsertMenuItemTranslation,
  toggleLanguage,
} from "@/lib/translations";
import { useToast } from "@/hooks/use-toast";

interface AdminTranslationsProps {
  restaurant: Restaurant;
  setRestaurant: React.Dispatch<React.SetStateAction<Restaurant | null>>;
}

export function AdminTranslations({
  restaurant,
  setRestaurant,
}: AdminTranslationsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enEnabled, setEnEnabled] = useState(
    restaurant.enabledLanguages?.includes("en") ?? false
  );

  // Restaurant-level translations
  const [restName, setRestName] = useState("");
  const [restDesc, setRestDesc] = useState("");

  // Category translations: { [categoryId]: name }
  const [catTrans, setCatTrans] = useState<Record<string, string>>({});

  // Menu item translations: { [itemId]: { name, description, ingredients, portionInfo, allergenInfo } }
  const [itemTrans, setItemTrans] = useState<
    Record<string, { name: string; description: string; ingredients: string; portionInfo: string; allergenInfo: string }>
  >({});

  const loadTranslations = useCallback(async () => {
    setLoading(true);
    try {
      const [rTrans, cTrans, mTrans] = await Promise.all([
        getRestaurantTranslations(restaurant.id, "en"),
        getCategoryTranslations(restaurant.id, "en"),
        getMenuItemTranslations(restaurant.id, "en"),
      ]);

      if (rTrans) {
        setRestName(rTrans.name || "");
        setRestDesc(rTrans.description || "");
      }

      const catMap: Record<string, string> = {};
      for (const ct of cTrans) {
        catMap[ct.category_id] = ct.name || "";
      }
      setCatTrans(catMap);

      const itemMap: Record<string, { name: string; description: string; ingredients: string; portionInfo: string; allergenInfo: string }> = {};
      for (const mt of mTrans) {
        itemMap[mt.menu_item_id] = {
          name: mt.name || "",
          description: mt.description || "",
          ingredients: mt.ingredients || "",
          portionInfo: mt.portion_info || "",
          allergenInfo: mt.allergen_info || "",
        };
      }
      setItemTrans(itemMap);
    } catch {
      toast({ title: "Çeviriler yüklenemedi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [restaurant.id, toast]);

  useEffect(() => {
    if (enEnabled) {
      loadTranslations();
    } else {
      setLoading(false);
    }
  }, [enEnabled, loadTranslations]);

  const handleToggleEn = async (checked: boolean) => {
    const res = await toggleLanguage(restaurant.id, "en", checked);
    if (!res.ok) {
      toast({ title: res.error || "Hata", variant: "destructive" });
      return;
    }
    setEnEnabled(checked);
    setRestaurant((prev) => {
      if (!prev) return prev;
      const langs = checked
        ? [...(prev.enabledLanguages || ["tr"]), "en"]
        : (prev.enabledLanguages || ["tr"]).filter((l) => l !== "en");
      return { ...prev, enabledLanguages: langs };
    });
    toast({ title: checked ? "İngilizce aktif edildi" : "İngilizce devre dışı" });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Save restaurant translation
      await upsertRestaurantTranslation(restaurant.id, "en", {
        name: restName,
        description: restDesc,
      });

      // Save category translations
      for (const cat of restaurant.categories) {
        const name = catTrans[cat.id];
        if (name !== undefined) {
          await upsertCategoryTranslation(cat.id, "en", { name }, restaurant.id);
        }
      }

      // Save menu item translations
      for (const prod of restaurant.products) {
        const t = itemTrans[prod.id];
        if (t) {
          await upsertMenuItemTranslation(
            prod.id,
            "en",
            {
              name: t.name,
              description: t.description,
              ingredients: t.ingredients,
              portion_info: t.portionInfo,
              allergen_info: t.allergenInfo,
            },
            restaurant.id
          );
        }
      }

      toast({ title: "Tüm çeviriler kaydedildi ✓" });
    } catch {
      toast({ title: "Kaydetme hatası", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Languages className="w-6 h-6" />
            Dil Yönetimi
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Menünüzün İngilizce çevirilerini yönetin
          </p>
        </div>
        {enEnabled && (
          <Button onClick={handleSaveAll} disabled={saving || loading}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Tümünü Kaydet
          </Button>
        )}
      </div>

      {/* Language Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">English (İngilizce)</p>
                <p className="text-sm text-muted-foreground">
                  Menüde İngilizce dil seçeneği ekle
                </p>
              </div>
            </div>
            <Switch checked={enEnabled} onCheckedChange={handleToggleEn} />
          </div>
        </CardContent>
      </Card>

      {!enEnabled && (
        <div className="text-center py-12 text-muted-foreground">
          <Globe className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>İngilizce çevirileri düzenlemek için yukarıdan aktif edin.</p>
        </div>
      )}

      {enEnabled && loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {enEnabled && !loading && (
        <>
          {/* Restaurant Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Restoran Bilgileri
                <Badge variant="outline" className="text-xs">EN</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Türkçe Ad</Label>
                  <p className="text-sm font-medium mt-1">{restaurant.name}</p>
                </div>
                <div>
                  <Label>İngilizce Ad</Label>
                  <Input
                    value={restName}
                    onChange={(e) => setRestName(e.target.value)}
                    placeholder={restaurant.name}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Türkçe Açıklama</Label>
                  <p className="text-sm mt-1">{restaurant.description || "—"}</p>
                </div>
                <div>
                  <Label>İngilizce Açıklama</Label>
                  <Textarea
                    value={restDesc}
                    onChange={(e) => setRestDesc(e.target.value)}
                    placeholder={restaurant.description}
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Translations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Kategori Çevirileri
                <Badge variant="outline" className="text-xs">EN</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {restaurant.categories.length === 0 && (
                <p className="text-sm text-muted-foreground">Henüz kategori yok.</p>
              )}
              {[...restaurant.categories]
                .sort((a, b) => a.order - b.order)
                .map((cat) => (
                  <div key={cat.id} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                    <div>
                      <Label className="text-xs text-muted-foreground">TR</Label>
                      <p className="text-sm font-medium">{cat.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs">EN</Label>
                      <Input
                        value={catTrans[cat.id] || ""}
                        onChange={(e) =>
                          setCatTrans((prev) => ({ ...prev, [cat.id]: e.target.value }))
                        }
                        placeholder={cat.name}
                      />
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>

          {/* Menu Item Translations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Ürün Çevirileri
                <Badge variant="outline" className="text-xs">EN</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {restaurant.products.length === 0 && (
                <p className="text-sm text-muted-foreground">Henüz ürün yok.</p>
              )}
              {restaurant.products.map((prod) => {
                const t = itemTrans[prod.id] || {
                  name: "",
                  description: "",
                  ingredients: "",
                  portionInfo: "",
                  allergenInfo: "",
                };
                const updateField = (field: string, value: string) => {
                  setItemTrans((prev) => ({
                    ...prev,
                    [prod.id]: { ...t, [field]: value },
                  }));
                };

                return (
                  <div key={prod.id} className="border rounded-lg p-4 space-y-3">
                    <p className="font-medium text-sm">{prod.name}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">TR Ad</Label>
                        <p className="text-sm">{prod.name}</p>
                      </div>
                      <div>
                        <Label className="text-xs">EN Ad</Label>
                        <Input
                          value={t.name}
                          onChange={(e) => updateField("name", e.target.value)}
                          placeholder={prod.name}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">TR Açıklama</Label>
                        <p className="text-sm">{prod.description || "—"}</p>
                      </div>
                      <div>
                        <Label className="text-xs">EN Açıklama</Label>
                        <Textarea
                          value={t.description}
                          onChange={(e) => updateField("description", e.target.value)}
                          placeholder={prod.description}
                          rows={2}
                        />
                      </div>
                    </div>
                    {/* Ingredients */}
                    {prod.ingredients && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">TR İçindekiler</Label>
                          <p className="text-sm">{prod.ingredients}</p>
                        </div>
                        <div>
                          <Label className="text-xs">EN İçindekiler</Label>
                          <Input
                            value={t.ingredients}
                            onChange={(e) => updateField("ingredients", e.target.value)}
                            placeholder={prod.ingredients}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
