import { useState } from "react";
import type { Restaurant, Product } from "@/types";
import { Plus, Trash2, GripVertical, Loader2 } from "lucide-react";
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

interface Props {
  restaurant: Restaurant;
  setRestaurant: React.Dispatch<React.SetStateAction<Restaurant | null>>;
}

const emptyProduct = {
  name: "",
  description: "",
  price: "",
  categoryId: "",
  available: true,
  imagePreview: "",
};

export function AdminProducts({ restaurant, setRestaurant }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyProduct);
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  const sorted = [...restaurant.products].sort((a, b) => a.order - b.order);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setForm((f) => ({ ...f, imagePreview: url }));
    }
  };

  const addProduct = async () => {
    if (!form.name.trim() || !form.categoryId || adding) return;
    setAdding(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("menu_items")
        .insert({
          restaurant_id: restaurant.id,
          category_id: form.categoryId,
          name: form.name.trim(),
          description: form.description.trim(),
          price: parseFloat(form.price) || 0,
          image_url: form.imagePreview || "/placeholder.svg",
          is_available: form.available,
          order: restaurant.products.length,
        })
        .select("id")
        .single();

      if (error || !data) {
        toast({
          title: "Error",
          description: "Failed to add product: " + (error?.message || "Unknown error"),
          variant: "destructive",
        });
        return;
      }

      const product: Product = {
        id: data.id,
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price) || 0,
        image: form.imagePreview || "/placeholder.svg",
        categoryId: form.categoryId,
        available: form.available,
        order: restaurant.products.length,
      };

      setRestaurant((r) => r ? { ...r, products: [...r.products, product] } : r);
      setForm(emptyProduct);
      setOpen(false);
    } catch {
      toast({ title: "Error", description: "Failed to add product", variant: "destructive" });
    } finally {
      setAdding(false);
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
      toast({ title: "Error", description: "Failed to delete product", variant: "destructive" });
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
      toast({ title: "Error", description: "Failed to update availability", variant: "destructive" });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Products</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Product name"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Short description"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={form.categoryId}
                    onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {restaurant.categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Image</Label>
                <Input type="file" accept="image/*" onChange={handleImageUpload} />
                {form.imagePreview && (
                  <img
                    src={form.imagePreview}
                    alt="preview"
                    className="w-20 h-20 rounded-xl object-cover mt-2"
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.available}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, available: v }))}
                />
                <Label>Available</Label>
              </div>
              <Button onClick={addProduct} className="w-full" disabled={adding}>
                {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Add Product
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {sorted.map((product) => (
          <div
            key={product.id}
            className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl group"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />
            <img
              src={product.image}
              alt={product.name}
              className="w-10 h-10 rounded-lg object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground truncate">{product.name}</p>
              <p className="text-xs text-muted-foreground">
                ${product.price.toFixed(2)} ·{" "}
                {restaurant.categories.find((c) => c.id === product.categoryId)?.name || "—"}
              </p>
            </div>
            <Switch
              checked={product.available}
              onCheckedChange={() => toggleAvailability(product.id)}
            />
            <button
              onClick={() => deleteProduct(product.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground">No products yet. Add one above.</p>
        )}
      </div>
    </div>
  );
}
