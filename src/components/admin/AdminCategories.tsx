import { useState } from "react";
import type { Restaurant, Category } from "@/types";
import { Plus, Trash2, GripVertical, Loader2 } from "lucide-react";
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
  const { toast } = useToast();

  const sorted = [...restaurant.categories].sort((a, b) => a.order - b.order);

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
          description: "Failed to add category: " + (error?.message || "Unknown error"),
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
      toast({ title: "Error", description: "Failed to add category", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const deleteCategory = async (id: string) => {
    const prev = restaurant.categories;
    const prevProducts = restaurant.products;

    // Optimistic remove
    setRestaurant((r) =>
      r
        ? {
            ...r,
            categories: r.categories.filter((c) => c.id !== id),
            products: r.products.filter((p) => p.categoryId !== id),
          }
        : r
    );

    try {
      const supabase = createClient();
      await supabase.from("menu_items").delete().eq("category_id", id);
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    } catch {
      // Revert on failure
      setRestaurant((r) => r ? { ...r, categories: prev, products: prevProducts } : r);
      toast({ title: "Error", description: "Failed to delete category", variant: "destructive" });
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Categories</h1>

      <div className="flex gap-2 mb-6 max-w-md">
        <Input
          placeholder="New category name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCategory()}
        />
        <Button onClick={addCategory} size="sm" disabled={adding}>
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
          {adding ? "" : "Add"}
        </Button>
      </div>

      <div className="space-y-2 max-w-md">
        {sorted.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl group"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
            <span className="flex-1 font-medium text-sm text-foreground">{cat.name}</span>
            <button
              onClick={() => deleteCategory(cat.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground">No categories yet. Add one above.</p>
        )}
      </div>
    </div>
  );
}
