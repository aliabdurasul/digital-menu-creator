import { useState } from "react";
import type { Restaurant, Product } from "@/types";
import { Plus, Trash2, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableItem } from "./SortableItem";
import { arrayMove, persistReorder } from "@/lib/reorder";

interface Props {
  restaurant: Restaurant;
  setRestaurant: React.Dispatch<React.SetStateAction<Restaurant | null>>;
}

const emptyForm = {
  name: "",
  description: "",
  price: "",
  categoryId: "",
  available: true,
  imagePreview: "",
  ingredients: "",
  portionInfo: "",
  allergenInfo: "",
};

type FormErrors = Record<string, string>;

export function AdminProducts({ restaurant, setRestaurant }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const { toast } = useToast();

  const sorted = [...restaurant.products].sort((a, b) => a.order - b.order);
  const isEditing = !!editingProduct;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Drag and drop ──
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sorted.findIndex((p) => p.id === active.id);
    const newIndex = sorted.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sorted, oldIndex, newIndex).map((p, i) => ({
      ...p,
      order: i,
    }));

    const prevProducts = restaurant.products;

    // Optimistic update
    setRestaurant((r) => r ? { ...r, products: reordered } : r);

    try {
      await persistReorder("menu_items", reordered);
    } catch {
      setRestaurant((r) => r ? { ...r, products: prevProducts } : r);
      toast({ title: "Hata", description: "Sıralama kaydedilemedi", variant: "destructive" });
    }
  };

  // ── Validation ──
  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!form.name.trim()) errs.name = "Ürün adı gereklidir";
    if (!form.categoryId) errs.categoryId = "Kategori gereklidir";
    const price = parseFloat(form.price);
    if (!form.price || isNaN(price) || price < 0) errs.price = "Geçerli bir fiyat gereklidir";
    return errs;
  };

  const clearFieldError = (field: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const isFormValid = form.name.trim() && form.categoryId && form.price && !isNaN(parseFloat(form.price)) && parseFloat(form.price) >= 0;

  // ── Image Upload (real Supabase storage) ──
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setForm((f) => ({ ...f, imagePreview: localUrl }));

    // Upload to Supabase storage
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${restaurant.id}/products/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("images")
        .upload(path, file, { upsert: true });

      if (error) {
        toast({ title: "Yükleme başarısız", description: error.message, variant: "destructive" });
        return;
      }

      const { data } = supabase.storage.from("images").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
      setForm((f) => ({ ...f, imagePreview: publicUrl }));
    } catch {
      toast({ title: "Yükleme başarısız", description: "Görsel yüklenemedi", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // ── Open dialog for editing ──
  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      categoryId: product.categoryId || "",
      available: product.available,
      imagePreview: product.image,
      ingredients: product.ingredients || "",
      portionInfo: product.portionInfo || "",
      allergenInfo: product.allergenInfo || "",
    });
    setErrors({});
    setOpen(true);
  };

  // ── Open dialog for adding ──
  const openAdd = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setErrors({});
    setOpen(true);
  };

  // ── Dialog close handler ──
  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setEditingProduct(null);
      setForm(emptyForm);
      setErrors({});
    }
  };

  // ── Save (add or update) ──
  const saveProduct = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    if (saving) return;
    setSaving(true);

    const payload: Record<string, unknown> = {
      category_id: form.categoryId || null,
      name: form.name.trim(),
      description: form.description.trim(),
      price: parseFloat(form.price) || 0,
      image_url: form.imagePreview || "/placeholder.svg",
      is_available: form.available,
      ingredients: form.ingredients.trim(),
      portion_info: form.portionInfo.trim(),
      allergen_info: form.allergenInfo.trim(),
    };

    const _ingredients = form.ingredients.trim();
    const _portionInfo = form.portionInfo.trim();
    const _allergenInfo = form.allergenInfo.trim();

    try {
      const supabase = createClient();

      if (isEditing && editingProduct) {
        // ── UPDATE ──
        const { data, error } = await supabase
          .from("menu_items")
          .update(payload)
          .eq("id", editingProduct.id)
          .select("id")
          .single();

        if (error || !data) {
          toast({ title: "Hata", description: "Ürün güncellenemedi: " + (error?.message || "Erişim reddedildi"), variant: "destructive" });
          return;
        }

        const updated: Product = {
          ...editingProduct,
          name: payload.name as string,
          description: payload.description as string,
          price: payload.price as number,
          image: payload.image_url as string,
          categoryId: payload.category_id as string | null,
          available: payload.is_available as boolean,
          ingredients: _ingredients || editingProduct.ingredients,
          portionInfo: _portionInfo || editingProduct.portionInfo,
          allergenInfo: _allergenInfo || editingProduct.allergenInfo,
        };

        setRestaurant((r) =>
          r ? { ...r, products: r.products.map((p) => (p.id === editingProduct.id ? updated : p)) } : r
        );
        toast({ title: "Güncellendi", description: `"${updated.name}" kaydedildi.` });
      } else {
        // ── INSERT ──
        const { data, error } = await supabase
          .from("menu_items")
          .insert({ ...payload, restaurant_id: restaurant.id, order: restaurant.products.length })
          .select("id")
          .single();

        if (error || !data) {
          toast({ title: "Hata", description: "Ürün eklenemedi: " + (error?.message || "Bilinmeyen hata"), variant: "destructive" });
          return;
        }

        const product: Product = {
          id: data.id,
          name: payload.name as string,
          description: payload.description as string,
          price: payload.price as number,
          image: payload.image_url as string,
          categoryId: payload.category_id as string | null,
          available: payload.is_available as boolean,
          order: restaurant.products.length,
          ingredients: _ingredients,
          portionInfo: _portionInfo,
          allergenInfo: _allergenInfo,
        };

        setRestaurant((r) => r ? { ...r, products: [...r.products, product] } : r);
        toast({ title: "Eklendi", description: `"${product.name}" oluşturuldu.` });
      }

      setForm(emptyForm);
      setEditingProduct(null);
      setOpen(false);
    } catch {
      toast({ title: "Hata", description: "Ürün kaydedilemedi", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id: string) => {
    const prev = restaurant.products;
    setRestaurant((r) =>
      r ? { ...r, products: r.products.filter((p) => p.id !== id) } : r
    );

    try {
      const supabase = createClient();
      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) throw error;
    } catch {
      setRestaurant((r) => r ? { ...r, products: prev } : r);
      toast({ title: "Hata", description: "Ürün silinemedi", variant: "destructive" });
    }
  };

  const toggleAvailability = async (id: string) => {
    const target = restaurant.products.find((p) => p.id === id);
    if (!target) return;
    const prev = restaurant.products;

    setRestaurant((r) =>
      r
        ? {
            ...r,
            products: r.products.map((p) =>
              p.id === id ? { ...p, available: !p.available } : p
            ),
          }
        : r
    );

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("menu_items")
        .update({ is_available: !target.available })
        .eq("id", id);
      if (error) throw error;
    } catch {
      setRestaurant((r) => r ? { ...r, products: prev } : r);
      toast({ title: "Hata", description: "Durum güncellenemedi", variant: "destructive" });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Ürünler</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-1" /> Ürün Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Ürünü Düzenle" : "Ürün Ekle"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Ad</Label>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, name: e.target.value }));
                    clearFieldError("name");
                  }}
                  placeholder="Ürün adı"
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
              </div>
              <div>
                <Label className="text-xs">Açıklama</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Kısa açıklama"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-xs">Malzemeler</Label>
                <Textarea
                  value={form.ingredients}
                  onChange={(e) => setForm((f) => ({ ...f, ingredients: e.target.value }))}
                  placeholder="Örn: domates, peynir, zeytinyağı..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Porsiyon Bilgisi</Label>
                  <Input
                    value={form.portionInfo}
                    onChange={(e) => setForm((f) => ({ ...f, portionInfo: e.target.value }))}
                    placeholder="Örn: 250g / 2 kişilik"
                  />
                </div>
                <div>
                  <Label className="text-xs">Alerjen Bilgisi</Label>
                  <Input
                    value={form.allergenInfo}
                    onChange={(e) => setForm((f) => ({ ...f, allergenInfo: e.target.value }))}
                    placeholder="Örn: gluten, süt"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Fiyat</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, price: e.target.value }));
                      clearFieldError("price");
                    }}
                    placeholder="0.00"
                    className={errors.price ? "border-destructive" : ""}
                  />
                  {errors.price && <p className="text-xs text-destructive mt-1">{errors.price}</p>}
                </div>
                <div>
                  <Label className="text-xs">Kategori</Label>
                  <Select
                    value={form.categoryId}
                    onValueChange={(v) => {
                      setForm((f) => ({ ...f, categoryId: v }));
                      clearFieldError("categoryId");
                    }}
                  >
                    <SelectTrigger className={errors.categoryId ? "border-destructive" : ""}>
                      <SelectValue placeholder="Seç..." />
                    </SelectTrigger>
                    <SelectContent>
                      {restaurant.categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.categoryId && <p className="text-xs text-destructive mt-1">{errors.categoryId}</p>}
                </div>
              </div>
              <div>
                <Label className="text-xs">Görsel</Label>
                <div className="flex items-center gap-3">
                  <Input type="file" accept="image/*" onChange={handleImageUpload} className="flex-1" />
                  {uploading && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
                  )}
                  {form.imagePreview && !uploading && (
                    <img
                      src={form.imagePreview}
                      alt="preview"
                      className="w-10 h-10 rounded-lg object-cover shrink-0"
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.available}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, available: v }))}
                />
                <Label>Mevcut</Label>
              </div>
              <Button
                onClick={saveProduct}
                className="w-full"
                disabled={saving || uploading || !isFormValid}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isEditing ? "Değişiklikleri Kaydet" : "Ürün Ekle"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sorted.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sorted.map((product) => (
              <SortableItem key={product.id} id={product.id}>
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-10 h-10 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    ₺{product.price.toFixed(2)} ·{" "}
                    {restaurant.categories.find((c) => c.id === product.categoryId)?.name || "Kategorisiz"}
                  </p>
                </div>
                <Switch
                  checked={product.available}
                  onCheckedChange={() => toggleAvailability(product.id)}
                />
                <button
                  onClick={() => openEdit(product)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteProduct(product.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </SortableItem>
            ))}
            {sorted.length === 0 && (
              <p className="text-sm text-muted-foreground">Henüz ürün yok. Yukarıdan ekleyin.</p>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
