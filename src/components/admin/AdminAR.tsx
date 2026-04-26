"use client";

import { useState, useRef, Suspense, lazy } from "react";
import type { Restaurant, Product } from "@/types";
import { Box, Eye, Trash2, Loader2, Plus, Check } from "lucide-react";
import { uploadGlb, type UploadStatus } from "@/lib/glbUpload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sizeCmDraft, setSizeCmDraft] = useState<Record<string, string>>({});
  // "Assign after upload" dialog
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState("");
  const [assignProductId, setAssignProductId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // ── Upload progress state (large files only) ──────────────────────────────
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadAttempt, setUploadAttempt] = useState(1);

  const productsWithModels = restaurant.products.filter((p) => p.arModelUrl);
  const productsWithoutModels = restaurant.products.filter((p) => !p.arModelUrl);

  // ── Upload new GLB and immediately assign to a chosen product ──
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    // Reset progress state
    setUploadProgress(0);
    setUploadStatus("idle");
    setUploadAttempt(1);
    setUploading(true);

    try {
      const url = await uploadGlb(file, restaurant.id, {
        onProgress: (pct) => setUploadProgress(pct),
        onStatus:   (status, attempt) => {
          setUploadStatus(status);
          if (attempt != null) setUploadAttempt(attempt);
        },
      });

      // ── Post-upload logic is IDENTICAL to the original ──
      if (selectedProduct) {
        await assignModel(selectedProduct.id, url, selectedProduct.arModelSizeCm);
      } else {
        setPendingUrl(url);
        setPendingFileName(file.name);
        setAssignProductId(restaurant.products[0]?.id ?? "");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Model yüklenemedi";
      toast({ title: "Yükleme başarısız", description: message, variant: "destructive" });
      setUploadStatus("failed");
    } finally {
      setUploading(false);
      // Reset progress display after a short delay
      setTimeout(() => {
        setUploadProgress(0);
        setUploadStatus("idle");
      }, 3000);
    }
  };

  // ── Confirm assignment from the dialog ──
  const handleAssignConfirm = async () => {
    if (!pendingUrl || !assignProductId) return;
    setAssigning(true);
    await assignModel(assignProductId, pendingUrl, null);
    const target = restaurant.products.find((p) => p.id === assignProductId);
    if (target) setSelectedProduct({ ...target, arModelUrl: pendingUrl, arModelSizeCm: null });
    setPendingUrl(null);
    setPendingFileName("");
    setAssignProductId("");
    setAssigning(false);
  };

  // ── Assign a URL to a product (PATCH) ──
  const assignModel = async (
    productId: string,
    url: string,
    sizeCm: number | null
  ) => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("menu_items")
        .update({ ar_model_url: url, ar_model_size_cm: sizeCm })
        .eq("id", productId);
      if (error) throw error;

      setRestaurant((r) =>
        r
          ? {
              ...r,
              products: r.products.map((p) =>
                p.id === productId
                  ? { ...p, arModelUrl: url, arModelSizeCm: sizeCm }
                  : p
              ),
            }
          : r
      );

      // Keep detail panel in sync
      setSelectedProduct((prev) =>
        prev?.id === productId ? { ...prev, arModelUrl: url, arModelSizeCm: sizeCm } : prev
      );

      toast({ title: "Model atandı", description: restaurant.products.find((p) => p.id === productId)?.name });
    } catch {
      toast({ title: "Hata", description: "Model atanamadı", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Save size_cm after blur ──
  const handleSizeSave = async (product: Product) => {
    const raw = sizeCmDraft[product.id];
    if (raw === undefined) return; // no edit in progress
    const value = raw === "" ? null : parseFloat(raw);
    if (value !== null && isNaN(value)) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("menu_items")
        .update({ ar_model_size_cm: value })
        .eq("id", product.id);
      if (error) throw error;

      setRestaurant((r) =>
        r
          ? {
              ...r,
              products: r.products.map((p) =>
                p.id === product.id ? { ...p, arModelSizeCm: value } : p
              ),
            }
          : r
      );
      setSelectedProduct((prev) =>
        prev?.id === product.id ? { ...prev, arModelSizeCm: value } : prev
      );
      setSizeCmDraft((d) => { const next = { ...d }; delete next[product.id]; return next; });
    } catch {
      toast({ title: "Hata", description: "Boyut kaydedilemedi", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Remove model from product ──
  const handleRemoveModel = async (product: Product) => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("menu_items")
        .update({ ar_model_url: "", ar_model_size_cm: null })
        .eq("id", product.id);
      if (error) throw error;

      setRestaurant((r) =>
        r
          ? {
              ...r,
              products: r.products.map((p) =>
                p.id === product.id ? { ...p, arModelUrl: "", arModelSizeCm: null } : p
              ),
            }
          : r
      );
      if (selectedProduct?.id === product.id) setSelectedProduct(null);
      toast({ title: "Model kaldırıldı", description: `"${product.name}"` });
    } catch {
      toast({ title: "Hata", description: "Model kaldırılamadı", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const currentSizeCm = selectedProduct
    ? (sizeCmDraft[selectedProduct.id] !== undefined
        ? sizeCmDraft[selectedProduct.id]
        : selectedProduct.arModelSizeCm != null
          ? String(selectedProduct.arModelSizeCm)
          : "")
    : "";

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AR Modeller</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            3D modellerini yükle, önizle ve ürünlere ata
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1">
            <Box className="w-3.5 h-3.5" />
            {productsWithModels.length} model
          </Badge>
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb"
            className="hidden"
            onChange={handleUpload}
          />
          <div className="flex flex-col items-end gap-1.5">
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Plus className="w-4 h-4 mr-1.5" />
              )}
              {uploading
                ? uploadStatus === "retrying"
                  ? `Yeniden deneniyor (${uploadAttempt}/2)...`
                  : "Yükleniyor..."
                : "Model Yükle"}
            </Button>

            {/* Progress bar — only visible for large files (direct upload path) */}
            {uploading && uploadProgress > 0 && (
              <div className="w-36 flex flex-col gap-1">
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground text-right">
                  {uploadProgress}%
                </span>
              </div>
            )}

            {/* Failed state badge */}
            {uploadStatus === "failed" && !uploading && (
              <span className="text-[10px] text-destructive">Yükleme başarısız</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">

        {/* LEFT: Model list */}
        <div className="lg:w-72 shrink-0 space-y-1">
          {productsWithModels.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <Box className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Henüz model yok</p>
              <p className="text-xs text-muted-foreground max-w-[180px]">
                Yukarıdaki "Model Yükle" butonundan .glb dosyası yükleyin
              </p>
            </div>
          )}

          {productsWithModels.map((product) => {
            const isSelected = selectedProduct?.id === product.id;
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => setSelectedProduct(product)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-muted">
                  <img
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <p className={`text-[11px] truncate ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {product.arModelSizeCm != null ? `${product.arModelSizeCm} cm` : "Boyut belirsiz"}
                  </p>
                </div>
                <Box className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-primary-foreground/70" : "text-primary"}`} />
              </button>
            );
          })}
        </div>

        {/* RIGHT: Detail / preview panel */}
        <div className="flex-1 min-w-0">
          {!selectedProduct ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center py-20 rounded-2xl border border-dashed border-border bg-muted/20">
              <Box className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {productsWithModels.length > 0
                  ? "Soldaki listeden bir model seçin"
                  : "Henüz model yüklenmedi"}
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* 3D Preview */}
              <div className="relative aspect-square bg-muted max-h-[420px]">
                <ARModelPreview
                  src={selectedProduct.arModelUrl}
                  name={selectedProduct.name}
                  sizeCm={selectedProduct.arModelSizeCm}
                  poster={selectedProduct.image !== "/placeholder.svg" ? selectedProduct.image : undefined}
                  onPreviewAR={() => setPreviewOpen(true)}
                />
              </div>

              {/* Controls */}
              <div className="p-4 space-y-4">
                <div>
                  <p className="font-semibold text-foreground">{selectedProduct.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 break-all">
                    {selectedProduct.arModelUrl.split("/").pop()}
                  </p>
                </div>

                {/* Real-world size */}
                <div>
                  <Label className="text-xs">Gerçek boyut (cm) — AR ölçeği için</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="number"
                      min="1"
                      max="500"
                      step="1"
                      value={currentSizeCm}
                      onChange={(e) =>
                        setSizeCmDraft((d) => ({ ...d, [selectedProduct.id]: e.target.value }))
                      }
                      onBlur={() => handleSizeSave(selectedProduct)}
                      placeholder="örn: 25"
                      className="flex-1"
                    />
                    {saving && <Loader2 className="w-4 h-4 animate-spin self-center text-muted-foreground" />}
                    {!saving && sizeCmDraft[selectedProduct.id] === undefined && selectedProduct.arModelSizeCm != null && (
                      <Check className="w-4 h-4 self-center text-green-500" />
                    )}
                  </div>
                </div>

                {/* Re-assign to different product */}
                <div>
                  <Label className="text-xs">Farklı ürüne ata</Label>
                  <Select
                    onValueChange={(newProductId) => {
                      assignModel(newProductId, selectedProduct.arModelUrl, selectedProduct.arModelSizeCm);
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Ürün seç..." />
                    </SelectTrigger>
                    <SelectContent>
                      {productsWithoutModels.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                      {productsWithoutModels.length === 0 && (
                        <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                          Tüm ürünlerin modeli var
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => setPreviewOpen(true)}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    AR Önizleme
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 px-3"
                    disabled={saving}
                    onClick={() => handleRemoveModel(selectedProduct)}
                    title="Modeli Kaldır"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Assign-after-upload dialog ── */}
      <Dialog
        open={!!pendingUrl}
        onOpenChange={(open) => {
          if (!open) { setPendingUrl(null); setAssignProductId(""); }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modeli Ürüne Ata</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
              <Box className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm truncate">{pendingFileName}</span>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Hangi ürüne bağlanacak?</Label>
              <Select value={assignProductId} onValueChange={setAssignProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Ürün seç..." />
                </SelectTrigger>
                <SelectContent>
                  {restaurant.products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        {p.name}
                        {p.arModelUrl && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1">var</Badge>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assignProductId &&
                restaurant.products.find((p) => p.id === assignProductId)?.arModelUrl && (
                  <p className="text-[11px] text-amber-500 mt-1.5">
                    Bu ürünün mevcut modeli üzerine yazılacak.
                  </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setPendingUrl(null); setAssignProductId(""); }}
            >
              İptal
            </Button>
            <Button
              disabled={!assignProductId || assigning}
              onClick={handleAssignConfirm}
            >
              {assigning && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Ata
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AR fullscreen preview */}
      {previewOpen && selectedProduct && (
        <Suspense fallback={null}>
          <ARViewer
            src={selectedProduct.arModelUrl}
            name={selectedProduct.name}
            sizeCm={selectedProduct.arModelSizeCm}
            category={
              restaurant.categories.find((c) => c.id === selectedProduct.categoryId)?.name ?? null
            }
            poster={
              selectedProduct.image && selectedProduct.image !== "/placeholder.svg"
                ? selectedProduct.image
                : undefined
            }
            onClose={() => setPreviewOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

// ── Inline 3D orbit preview (not fullscreen AR) ──
function ARModelPreview({
  src,
  name,
  sizeCm,
  poster,
  onPreviewAR,
}: {
  src: string;
  name: string;
  sizeCm: number | null;
  poster?: string;
  onPreviewAR: () => void;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const scaleMetre = ((sizeCm ?? 15) / 100).toFixed(3);

  return (
    <div className="relative w-full h-full">
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-muted">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-muted gap-2">
          <Box className="w-8 h-8 text-muted-foreground" />
          <p className="text-xs text-destructive">Model yüklenemedi</p>
        </div>
      )}
      {/* @ts-ignore model-viewer is a custom element */}
      <model-viewer
        src={src}
        alt={`${name} 3D model`}
        camera-controls
        auto-rotate
        shadow-intensity="1"
        loading="eager"
        poster={poster}
        onLoad={() => setStatus("ready")}
        onError={() => setStatus("error")}
        style={{
          width: "100%",
          height: "100%",
          opacity: status === "ready" ? 1 : 0,
          transition: "opacity 0.4s ease",
          ["--model-scale" as string]: scaleMetre,
        }}
      />
      <button
        type="button"
        onClick={onPreviewAR}
        className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 hover:bg-black/80 text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors backdrop-blur-sm"
      >
        <Eye className="w-3.5 h-3.5" />
        AR Dene
      </button>
    </div>
  );
}

