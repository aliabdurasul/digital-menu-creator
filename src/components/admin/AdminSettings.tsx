import { useState } from "react";
import type { Restaurant } from "@/types";
import type { ModuleType } from "@/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  restaurant: Restaurant;
  setRestaurant: React.Dispatch<React.SetStateAction<Restaurant | null>>;
  moduleType?: ModuleType;
}

export function AdminSettings({ restaurant, setRestaurant, moduleType = "restaurant" }: Props) {
  const [logoPreview, setLogoPreview] = useState(restaurant.logo);
  const [coverPreview, setCoverPreview] = useState(restaurant.coverImage);

  // Text fields
  const [name, setName] = useState(restaurant.name);
  const [description, setDescription] = useState(restaurant.description);
  const [phone, setPhone] = useState(restaurant.phone);
  const [address, setAddress] = useState(restaurant.address);
  const [menuStatus, setMenuStatus] = useState<"active" | "paused">(restaurant.menuStatus);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const entityName = moduleType === "cafe" ? "Kafe" : "Restoran";

  const uploadImage = async (file: File, path: string): Promise<string | null> => {
    try {
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("images")
        .upload(path, file, { upsert: true });
      if (error) return null;
      const { data } = supabase.storage.from("images").getPublicUrl(path);
      return `${data.publicUrl}?v=${Date.now()}`;
    } catch {
      return null;
    }
  };

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setLogoPreview(localUrl);
    setRestaurant((r) => r ? { ...r, logo: localUrl } : r);

    const publicUrl = await uploadImage(file, `${restaurant.id}/logo`);
    if (publicUrl) {
      setLogoPreview(publicUrl);
      setRestaurant((r) => r ? { ...r, logo: publicUrl } : r);
      try {
        const supabase = createClient();
        await supabase
          .from("restaurants")
          .update({ logo_url: publicUrl })
          .eq("id", restaurant.id);
      } catch { /* DB not ready */ }
    }
  };

  const handleCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setCoverPreview(localUrl);
    setRestaurant((r) => r ? { ...r, coverImage: localUrl } : r);

    const publicUrl = await uploadImage(file, `${restaurant.id}/cover`);
    if (publicUrl) {
      setCoverPreview(publicUrl);
      setRestaurant((r) => r ? { ...r, coverImage: publicUrl } : r);
      try {
        const supabase = createClient();
        await supabase
          .from("restaurants")
          .update({ cover_image_url: publicUrl })
          .eq("id", restaurant.id);
      } catch { /* DB not ready */ }
    }
  };

  const saveSettings = async () => {
    if (!name.trim()) {
      toast({ title: "Hata", description: `${entityName} adı gereklidir`, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("restaurants")
        .update({
          name: name.trim(),
          description: description.trim(),
          phone: phone.trim(),
          address: address.trim(),
          menu_status: menuStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", restaurant.id);

      if (error) throw error;

      setRestaurant((r) =>
        r
          ? {
              ...r,
              name: name.trim(),
              description: description.trim(),
              phone: phone.trim(),
              address: address.trim(),
              menuStatus,
            }
          : r
      );
      toast({ title: "Kaydedildi", description: "Ayarlar güncellendi." });
    } catch {
      toast({ title: "Hata", description: "Ayarlar kaydedilemedi", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Ayarlar</h1>

      <div className="space-y-8 max-w-lg">
        {/* Logo */}
        <div>
          <Label className="mb-2 block">{entityName} Logosu</Label>
          <label className="relative w-24 h-24 rounded-2xl bg-muted border-2 border-dashed border-border flex items-center justify-center cursor-pointer overflow-hidden group">
            {logoPreview ? (
              <img src={logoPreview} alt="logo" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-6 h-6 text-muted-foreground" />
            )}
            <div className="absolute inset-0 bg-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary-foreground" />
            </div>
            <Input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleLogo}
            />
          </label>
        </div>

        {/* Cover Image */}
        <div>
          <Label className="mb-2 block">Kapak Görseli</Label>
          <label className="relative w-full h-40 rounded-2xl bg-muted border-2 border-dashed border-border flex items-center justify-center cursor-pointer overflow-hidden group">
            {coverPreview ? (
              <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-8 h-8 text-muted-foreground" />
            )}
            <div className="absolute inset-0 bg-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-6 h-6 text-primary-foreground" />
            </div>
            <Input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleCover}
            />
          </label>
        </div>

        {/* Restaurant Name */}
        <div>
          <Label className="mb-2 block">{entityName} Adı</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`${entityName} adı`}
          />
        </div>

        {/* Slug (read-only) */}
        <div>
          <Label className="mb-2 block">Slug (URL tanımlayıcısı)</Label>
          <Input
            value={restaurant.slug}
            readOnly
            className="bg-muted text-muted-foreground cursor-not-allowed"
          />
        </div>

        {/* Description */}
        <div>
          <Label className="mb-2 block">{entityName} Açıklaması</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={`${entityName}nız hakkında kısa bir açıklama`}
            rows={3}
          />
        </div>

        {/* Phone */}
        <div>
          <Label className="mb-2 block">
            Telefon <span className="text-xs text-muted-foreground">(herkese açık menüde gösterilmez)</span>
          </Label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+90 (5XX) 000 0000"
          />
        </div>

        {/* Address */}
        <div>
          <Label className="mb-2 block">
            Adres <span className="text-xs text-muted-foreground">(herkese açık menüde gösterilmez)</span>
          </Label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Atatürk Cd. No:1, İstanbul"
          />
        </div>

        {/* Menu Status */}
        <div>
          <Label className="mb-2 block">Menü Durumu</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={menuStatus === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => setMenuStatus("active")}
            >
              Aktif
            </Button>
            <Button
              type="button"
              variant={menuStatus === "paused" ? "destructive" : "outline"}
              size="sm"
              onClick={() => setMenuStatus("paused")}
            >
              Duraklatıldı
            </Button>
          </div>
        </div>

        {/* Save */}
        <Button onClick={saveSettings} disabled={saving} className="w-full">
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Değişiklikleri Kaydet
        </Button>
      </div>
    </div>
  );
}
