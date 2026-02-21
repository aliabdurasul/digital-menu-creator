import { useState, useRef, useEffect } from "react";
import type { Restaurant, Category } from "@/types";
import { Plus, Trash2, GripVertical, Loader2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  restaurant: Restaurant;
  setRestaurant: React.Dispatch<React.SetStateAction<Restaurant | null>>;
}

export function AdminCategories({ restaurant, setRestaurant }: Props) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const sorted = [...restaurant.categories].sort((a, b) => a.order - b.order);

  // Auto-focus the edit input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const addCategory = async () => {
    if (!newName.trim() || adding) return;
    setAdding(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("categories")
        .insert({
          restaurant_id: restaurant.id,
          name: newName.trim(),
          order: restaurant.categories.length,
        })
        .select("id")
        .single();

      if (error || !data) {
        toast({
          title: "Error",
          description: "Kategori eklenemedi: " + (error?.message || "Bilinmeyen hata"),
          variant: "destructive",
        });
        return;
      }

      const cat: Category = {
        id: data.id,
        name: newName.trim(),
        order: restaurant.categories.length,
      };
      setRestaurant((r) => r ? { ...r, categories: [...r.categories, cat] } : r);
      setNewName("");
    } catch {
      toast({ title: "Hata", description: "Kategori eklenemedi", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  // ── Inline edit ──
  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveEdit = async () => {
    if (!editingId || !editingName.trim()) {
      cancelEdit();
      return;
    }

    const trimmed = editingName.trim();
    const prevCategories = restaurant.categories;

    // Optimistic update
    setRestaurant((r) =>
      r
        ? { ...r, categories: r.categories.map((c) => c.id === editingId ? { ...c, name: trimmed } : c) }
        : r
    );
    setEditingId(null);
    setEditingName("");

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("categories")
        .update({ name: trimmed })
        .eq("id", editingId);
      if (error) throw error;
    } catch {
      // Revert
      setRestaurant((r) => r ? { ...r, categories: prevCategories } : r);
      toast({ title: "Hata", description: "Kategori yeniden adlandırılamadı", variant: "destructive" });
    }
  };

  const deleteCategory = async (id: string) => {
    const prev = restaurant.categories;
    const prevProducts = restaurant.products;

    // Optimistic: remove category, set orphaned products' categoryId to null
    setRestaurant((r) =>
      r
        ? {
            ...r,
            categories: r.categories.filter((c) => c.id !== id),
            products: r.products.map((p) =>
              p.categoryId === id ? { ...p, categoryId: null } : p
            ),
          }
        : r
    );

    try {
      const supabase = createClient();
      // DB handles SET NULL on menu_items.category_id automatically
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    } catch {
      // Revert on failure
      setRestaurant((r) => r ? { ...r, categories: prev, products: prevProducts } : r);
      toast({ title: "Hata", description: "Kategori silinemedi", variant: "destructive" });
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Kategoriler</h1>

      <div className="flex gap-2 mb-6 max-w-md">
        <Input
          placeholder="Yeni kategori adı..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCategory()}
        />
        <Button onClick={addCategory} size="sm" disabled={adding}>
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
          {adding ? "" : "Ekle"}
        </Button>
      </div>

      <div className="space-y-2 max-w-md">
        {sorted.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl group"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
            {editingId === cat.id ? (
              <>
                <Input
                  ref={editInputRef}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit();
                    if (e.key === "Escape") cancelEdit();
                  }}
                  className="flex-1 h-8 text-sm"
                />
                <button
                  onClick={saveEdit}
                  className="text-primary hover:text-primary/80"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={cancelEdit}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 font-medium text-sm text-foreground">{cat.name}</span>
                <button
                  onClick={() => startEdit(cat)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground">Henüz kategori yok. Yukarıdan ekleyin.</p>
        )}
      </div>
    </div>
  );
}
