"use client";

import { useState, Suspense, lazy } from "react";
import type { Restaurant } from "@/types";
import { Box, Eye, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ARViewer = lazy(() =>
  import("@/components/menu/ARViewer").then((m) => ({ default: m.ARViewer }))
);

interface Props {
  restaurant: Restaurant;
  setRestaurant: React.Dispatch<React.SetStateAction<Restaurant | null>>;
}

export function AdminAR({ restaurant, setRestaurant }: Props) {
  const [previewProduct, setPreviewProduct] = useState<{
    arModelUrl: string;
    name: string;
    image: string;
  } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const { toast } = useToast();

  const productsWithModels = restaurant.products.filter((p) => p.arModelUrl);

  const handleRemoveModel = async (productId: string, name: string) => {
    if (removing) return;
    setRemoving(productId);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("menu_items")
        .update({ ar_model_url: "", ar_model_size_cm: null })
        .eq("id", productId);

      if (error) throw error;

      setRestaurant((r) =>
        r
          ? {
              ...r,
              products: r.products.map((p) =>
                p.id === productId
                  ? { ...p, arModelUrl: "", arModelSizeCm: null }
                  : p
              ),
            }
          : r
      );
      toast({ title: "Model kaldırıldı", description: `"${name}" ürününün AR modeli silindi.` });
    } catch {
      toast({ title: "Hata", description: "Model kaldırılamadı", variant: "destructive" });
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AR Modeller</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            3D modellerini yönet, önizle ve AR denemesi yap
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Box className="w-3.5 h-3.5" />
          {productsWithModels.length} model
        </Badge>
      </div>

      {productsWithModels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Box className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">Henüz AR modeli yok</p>
            <p className="text-sm text-muted-foreground mt-1">
              Ürünler sekmesinden bir ürünü düzenleyip .glb model yükleyin
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg px-4 py-3 max-w-sm">
            <Upload className="w-4 h-4 shrink-0" />
            <span>
              Ürünler → Ürünü Düzenle → Gelişmiş Bilgiler → Model Yükle (.glb)
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {productsWithModels.map((product) => (
            <div
              key={product.id}
              className="group relative bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Product image */}
              <div className="aspect-square bg-muted relative overflow-hidden">
                <img
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                <Badge className="absolute top-2 right-2 gap-1 bg-black/60 text-white border-0 text-[11px]">
                  <Box className="w-3 h-3" />
                  AR
                </Badge>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="font-medium text-sm text-foreground truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ₺{product.price.toFixed(2)}
                  {product.arModelSizeCm != null && (
                    <> · {product.arModelSizeCm} cm</>
                  )}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 px-3 pb-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5 text-xs"
                  onClick={() =>
                    setPreviewProduct({
                      arModelUrl: product.arModelUrl,
                      name: product.name,
                      image: product.image,
                    })
                  }
                >
                  <Eye className="w-3.5 h-3.5" />
                  AR Önizleme
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                  disabled={removing === product.id}
                  onClick={() => handleRemoveModel(product.id, product.name)}
                  title="Modeli Kaldır"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AR Preview Modal */}
      {previewProduct && (
        <Suspense fallback={null}>
          <ARViewer
            src={previewProduct.arModelUrl}
            name={previewProduct.name}
            poster={
              previewProduct.image && previewProduct.image !== "/placeholder.svg"
                ? previewProduct.image
                : undefined
            }
            onClose={() => setPreviewProduct(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
