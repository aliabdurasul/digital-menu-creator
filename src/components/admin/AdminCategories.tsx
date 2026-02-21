import { useState } from "react";
import type { Restaurant, Category } from "@/types";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

interface Props {
  restaurant: Restaurant;
  setRestaurant: React.Dispatch<React.SetStateAction<Restaurant>>;
}

export function AdminCategories({ restaurant, setRestaurant }: Props) {
  const [newName, setNewName] = useState("");

  const sorted = [...restaurant.categories].sort((a, b) => a.order - b.order);

  const addCategory = async () => {
    if (!newName.trim()) return;
    const tempId = `cat-${Date.now()}`;
    const cat: Category = {
      id: tempId,
      name: newName.trim(),
      order: restaurant.categories.length,
    };

    // Optimistic UI update
    setRestaurant((r) => ({ ...r, categories: [...r.categories, cat] }));
    setNewName("");

    // Persist to Supabase
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("categories")
        .insert({
          restaurant_id: restaurant.id,
          name: cat.name,
          order: cat.order,
        })
        .select("id")
        .single();

      // Update the temp id with the real one
      if (data) {
        setRestaurant((r) => ({
          ...r,
          categories: r.categories.map((c) =>
            c.id === tempId ? { ...c, id: data.id } : c
          ),
        }));
      }
    } catch {
      // DB not ready — local state is fine
    }
  };

  const deleteCategory = async (id: string) => {
    // Optimistic UI update
    setRestaurant((r) => ({
      ...r,
      categories: r.categories.filter((c) => c.id !== id),
      products: r.products.filter((p) => p.categoryId !== id),
    }));

    // Persist to Supabase
    try {
      const supabase = createClient();
      await supabase.from("menu_items").delete().eq("category_id", id);
      await supabase.from("categories").delete().eq("id", id);
    } catch {
      // DB not ready — local state is fine
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
        <Button onClick={addCategory} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add
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
