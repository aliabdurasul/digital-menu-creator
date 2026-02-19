import { useState } from "react";
import type { Restaurant } from "@/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Camera } from "lucide-react";

interface Props {
  restaurant: Restaurant;
  setRestaurant: React.Dispatch<React.SetStateAction<Restaurant>>;
}

export function AdminSettings({ restaurant, setRestaurant }: Props) {
  const [logoPreview, setLogoPreview] = useState(restaurant.logo);
  const [coverPreview, setCoverPreview] = useState(restaurant.coverImage);

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
      setRestaurant((r) => ({ ...r, logo: url }));
    }
  };

  const handleCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCoverPreview(url);
      setRestaurant((r) => ({ ...r, coverImage: url }));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

      <div className="space-y-8 max-w-lg">
        <div>
          <Label className="mb-2 block">Restaurant Logo</Label>
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

        <div>
          <Label className="mb-2 block">Cover Image</Label>
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
      </div>
    </div>
  );
}
