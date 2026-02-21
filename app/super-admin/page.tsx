"use client";

import { useState, useEffect } from "react";
import { mockRestaurants } from "@/lib/mockData";
import type { Restaurant } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Eye, Shield, Loader2, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SuperAdminPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    async function loadRestaurants() {
      try {
        const supabase = createClient();
        const { data: dbRestaurants, error } = await supabase
          .from("restaurants")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && dbRestaurants && dbRestaurants.length > 0) {
          setRestaurants(
            dbRestaurants.map(
              (r: {
                id: string;
                slug: string;
                name: string;
                logo_url: string;
                cover_image_url: string;
                plan: string;
                active: boolean;
                total_views: number;
              }) => ({
                id: r.id,
                slug: r.slug,
                name: r.name,
                logo: r.logo_url || "",
                coverImage: r.cover_image_url || "",
                categories: [],
                products: [],
                plan: (r.plan || "basic") as "basic" | "pro",
                active: r.active ?? true,
                totalViews: r.total_views || 0,
              })
            )
          );
          setLoading(false);
          return;
        }
      } catch {
        // DB not ready — fall through to mock
      }

      // TODO: Remove mock fallback when DB is ready
      setRestaurants(mockRestaurants.map((r) => ({ ...r })));
      setLoading(false);
    }

    loadRestaurants();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const createRestaurant = async () => {
    if (!newName.trim()) return;
    const slug = newName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");

    try {
      const supabase = createClient();
      const { data: newRow, error } = await supabase
        .from("restaurants")
        .insert({
          name: newName.trim(),
          slug,
          logo_url: "",
          cover_image_url: "",
          plan: "basic",
          active: true,
          total_views: 0,
        })
        .select()
        .single();

      if (!error && newRow) {
        setRestaurants((prev) => [
          {
            id: newRow.id,
            slug: newRow.slug,
            name: newRow.name,
            logo: "",
            coverImage: "",
            categories: [],
            products: [],
            plan: "basic",
            active: true,
            totalViews: 0,
          },
          ...prev,
        ]);
        setNewName("");
        setOpen(false);
        return;
      }
    } catch {
      // DB not ready — fall through to mock
    }

    // Mock fallback
    const r: Restaurant = {
      id: `r-${Date.now()}`,
      slug,
      name: newName.trim(),
      logo: "",
      coverImage: "",
      categories: [],
      products: [],
      plan: "basic",
      active: true,
      totalViews: 0,
    };
    setRestaurants((prev) => [r, ...prev]);
    setNewName("");
    setOpen(false);
  };

  const deleteRestaurant = async (id: string) => {
    try {
      const supabase = createClient();
      await supabase.from("menu_items").delete().eq("restaurant_id", id);
      await supabase.from("categories").delete().eq("restaurant_id", id);
      await supabase.from("restaurants").delete().eq("id", id);
    } catch {
      // DB not ready — just remove locally
    }
    setRestaurants((prev) => prev.filter((r) => r.id !== id));
  };

  const toggleActive = async (id: string) => {
    const target = restaurants.find((r) => r.id === id);
    if (!target) return;
    try {
      const supabase = createClient();
      await supabase
        .from("restaurants")
        .update({ active: !target.active })
        .eq("id", id);
    } catch {
      // DB not ready — just update locally
    }
    setRestaurants((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  };

  const changePlan = async (id: string, plan: "basic" | "pro") => {
    try {
      const supabase = createClient();
      await supabase.from("restaurants").update({ plan }).eq("id", id);
    } catch {
      // DB not ready — just update locally
    }
    setRestaurants((prev) =>
      prev.map((r) => (r.id === id ? { ...r, plan } : r))
    );
  };

  const startEdit = (r: Restaurant) => {
    setEditingId(r.id);
    setEditName(r.name);
  };

  const saveEdit = async () => {
    if (!editName.trim() || !editingId) return;
    const newSlug = editName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
    try {
      const supabase = createClient();
      await supabase
        .from("restaurants")
        .update({ name: editName.trim(), slug: newSlug })
        .eq("id", editingId);
    } catch {
      // DB not ready — just update locally
    }
    setRestaurants((prev) =>
      prev.map((r) =>
        r.id === editingId
          ? { ...r, name: editName.trim(), slug: newSlug }
          : r
      )
    );
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-4xl mx-auto p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Super Admin</h1>
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-1" /> Sign Out
            </Button>
          </div>
        </div>

        <div className="flex justify-end mb-6">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" /> Create Restaurant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Restaurant</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Restaurant name"
                  onKeyDown={(e) => e.key === "Enter" && createRestaurant()}
                />
                <Button onClick={createRestaurant} className="w-full">
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {restaurants.map((r) => (
            <div
              key={r.id}
              className="bg-card border border-border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                {editingId === r.id ? (
                  <div className="flex gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                      className="h-8"
                    />
                    <Button size="sm" variant="outline" onClick={saveEdit}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => startEdit(r)}
                      className="font-bold text-foreground hover:text-primary transition-colors text-left"
                    >
                      {r.name}
                    </button>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={r.plan === "pro" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {r.plan.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {r.totalViews}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Select
                  value={r.plan}
                  onValueChange={(v) =>
                    changePlan(r.id, v as "basic" | "pro")
                  }
                >
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {r.active ? "Active" : "Inactive"}
                  </span>
                  <Switch
                    checked={r.active}
                    onCheckedChange={() => toggleActive(r.id)}
                  />
                </div>

                <button
                  onClick={() => deleteRestaurant(r.id)}
                  className="text-destructive hover:text-destructive/80 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
