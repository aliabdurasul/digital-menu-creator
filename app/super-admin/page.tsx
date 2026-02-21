"use client";

import { useState, useEffect } from "react";
import type { Restaurant } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Plus,
  Trash2,
  Eye,
  Shield,
  Loader2,
  LogOut,
  UserPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  getAllRestaurantsAdmin,
  createRestaurantWithAdmin,
  deleteRestaurantFull,
  toggleRestaurantActive,
  changeRestaurantPlan,
  renameRestaurant,
  assignAdminToRestaurant,
} from "@/lib/actions";

export default function SuperAdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [assignOpen, setAssignOpen] = useState<string | null>(null);
  const [assignEmail, setAssignEmail] = useState("");
  const [assignPassword, setAssignPassword] = useState("");
  const [assignCreateNew, setAssignCreateNew] = useState(false);

  useEffect(() => {
    async function loadRestaurants() {
      try {
        const result = await getAllRestaurantsAdmin();

        if (!result.success) {
          toast({
            title: "Error",
            description: result.error,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        setRestaurants(
          result.data.map((r) => ({
            id: r.id,
            slug: r.slug,
            name: r.name,
            description: r.description || "",
            phone: r.phone || "",
            address: r.address || "",
            logo: r.logo_url || "",
            coverImage: r.cover_image_url || "",
            categories: [],
            products: [],
            plan: (r.plan || "basic") as "basic" | "pro",
            active: r.active ?? true,
            menuStatus: (r.menu_status || "active") as "active" | "paused",
            totalViews: r.total_views || 0,
          }))
        );
      } catch {
        toast({
          title: "Error",
          description: "Failed to load restaurants",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadRestaurants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleCreateRestaurant = async () => {
    if (!newName.trim()) return;
    setCreating(true);

    const result = await createRestaurantWithAdmin(
      newName,
      newAdminEmail.trim() || undefined,
      newAdminPassword || undefined
    );

    setCreating(false);

    if (!result.success) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    const d = result.data;
    setRestaurants((prev) => [
      {
        id: d.id,
        slug: d.slug,
        name: d.name,
        description: "",
        phone: "",
        address: "",
        logo: "",
        coverImage: "",
        categories: [],
        products: [],
        plan: "basic",
        active: true,
        menuStatus: "active",
        totalViews: 0,
      },
      ...prev,
    ]);

    const msgs: string[] = [`Restaurant "${d.name}" created.`];
    if (d.adminUserId) {
      msgs.push(`Admin account (${newAdminEmail.trim()}) linked.`);
    } else if (newAdminEmail.trim()) {
      msgs.push("Warning: admin user could not be created. Assign one later.");
    }

    toast({ title: "Success", description: msgs.join(" ") });
    setNewName("");
    setNewAdminEmail("");
    setNewAdminPassword("");
    setOpen(false);
  };

  const handleDeleteRestaurant = async (id: string) => {
    const result = await deleteRestaurantFull(id);

    if (!result.success) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setRestaurants((prev) => prev.filter((r) => r.id !== id));
  };

  const handleToggleActive = async (id: string) => {
    const target = restaurants.find((r) => r.id === id);
    if (!target) return;

    const result = await toggleRestaurantActive(id, target.active);

    if (!result.success) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setRestaurants((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  };

  const handleChangePlan = async (id: string, plan: "basic" | "pro") => {
    const result = await changeRestaurantPlan(id, plan);

    if (!result.success) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
      return;
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

    const result = await renameRestaurant(editingId, editName);

    if (!result.success) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setRestaurants((prev) =>
      prev.map((r) =>
        r.id === editingId
          ? { ...r, name: editName.trim(), slug: result.data.slug }
          : r
      )
    );
    setEditingId(null);
  };

  const handleAssignAdmin = async (restaurantId: string) => {
    if (!assignEmail.trim()) return;

    const result = await assignAdminToRestaurant(
      restaurantId,
      assignEmail,
      assignCreateNew && !!assignPassword,
      assignPassword || undefined
    );

    if (!result.success) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Admin assigned",
      description: `${result.data.email} is now admin of this restaurant.`,
    });
    setAssignOpen(null);
    setAssignEmail("");
    setAssignPassword("");
    setAssignCreateNew(false);
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
                <div>
                  <Label htmlFor="r-name">Restaurant Name</Label>
                  <Input
                    id="r-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Restaurant name"
                  />
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Optionally create an admin account for this restaurant:
                  </p>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="admin-email">Admin Email</Label>
                      <Input
                        id="admin-email"
                        type="email"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="admin@restaurant.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin-pass">Admin Password</Label>
                      <Input
                        id="admin-pass"
                        type="password"
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        placeholder="Min 6 characters"
                      />
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleCreateRestaurant}
                  className="w-full"
                  disabled={creating || !newName.trim()}
                >
                  {creating && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {restaurants.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No restaurants yet. Create one to get started.
          </div>
        )}

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
                <Dialog
                  open={assignOpen === r.id}
                  onOpenChange={(v) => {
                    setAssignOpen(v ? r.id : null);
                    if (!v) {
                      setAssignEmail("");
                      setAssignPassword("");
                      setAssignCreateNew(false);
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                    >
                      <UserPlus className="w-3 h-3 mr-1" /> Assign
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign Admin to {r.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="assign-email">Email</Label>
                        <Input
                          id="assign-email"
                          value={assignEmail}
                          onChange={(e) => setAssignEmail(e.target.value)}
                          placeholder="Admin email address"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="create-new"
                          checked={assignCreateNew}
                          onCheckedChange={setAssignCreateNew}
                        />
                        <Label htmlFor="create-new" className="text-sm">
                          Create new account if not found
                        </Label>
                      </div>
                      {assignCreateNew && (
                        <div>
                          <Label htmlFor="assign-pass">Password</Label>
                          <Input
                            id="assign-pass"
                            type="password"
                            value={assignPassword}
                            onChange={(e) =>
                              setAssignPassword(e.target.value)
                            }
                            placeholder="Min 6 characters"
                          />
                        </div>
                      )}
                      <Button
                        onClick={() => handleAssignAdmin(r.id)}
                        className="w-full"
                      >
                        Assign
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Select
                  value={r.plan}
                  onValueChange={(v) =>
                    handleChangePlan(r.id, v as "basic" | "pro")
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
                    onCheckedChange={() => handleToggleActive(r.id)}
                  />
                </div>

                <button
                  onClick={() => handleDeleteRestaurant(r.id)}
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
