"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Restaurant } from "@/types";
import type { DbTable, TableStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, QrCode, ToggleLeft, ToggleRight, Loader2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminTablesProps {
  restaurant: Restaurant;
}

export function AdminTables({ restaurant }: AdminTablesProps) {
  const [tables, setTables] = useState<DbTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTables = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("restaurant_tables")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("label");
    setTables((data || []) as DbTable[]);
    setLoading(false);
  }, [restaurant.id]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const handleCreate = async () => {
    const label = newLabel.trim();
    if (!label) return;
    setCreating(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("restaurant_tables")
      .insert({ restaurant_id: restaurant.id, label, status: "active" });

    if (error) {
      toast({ title: "Hata", description: "Masa oluşturulamadı", variant: "destructive" });
    } else {
      setNewLabel("");
      toast({ title: "Masa oluşturuldu" });
      await fetchTables();
    }
    setCreating(false);
  };

  const toggleStatus = async (table: DbTable) => {
    const newStatus: TableStatus = table.status === "active" ? "inactive" : "active";
    const supabase = createClient();
    const { error } = await supabase
      .from("restaurant_tables")
      .update({ status: newStatus })
      .eq("id", table.id);

    if (!error) {
      setTables((prev) =>
        prev.map((t) => (t.id === table.id ? { ...t, status: newStatus } : t))
      );
    }
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("restaurant_tables").delete().eq("id", id);
    if (!error) {
      setTables((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Masa silindi" });
    } else {
      toast({ title: "Hata", description: "Masa silinemedi", variant: "destructive" });
    }
  };

  const getTableUrl = (tableId: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/r/${restaurant.slug}/table/${tableId}`;
  };

  const copyUrl = (tableId: string) => {
    navigator.clipboard.writeText(getTableUrl(tableId));
    setCopiedId(tableId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Masalar</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Masa ekleyin ve her masa için QR sipariş bağlantısı oluşturun.
        </p>
      </div>

      {/* Add new table */}
      <div className="flex gap-3">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Masa adı (ör: Masa 1, Bahçe 3)"
          className="max-w-xs"
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <Button onClick={handleCreate} disabled={creating || !newLabel.trim()}>
          {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          Masa Ekle
        </Button>
      </div>

      {/* Table list */}
      {tables.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4">Henüz masa eklenmemiş.</p>
      ) : (
        <div className="grid gap-3">
          {tables.map((table) => (
            <div
              key={table.id}
              className="flex items-center gap-4 p-4 rounded-lg border bg-card"
            >
              {/* Status indicator */}
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  table.status === "active" ? "bg-green-500" : "bg-muted-foreground/30"
                }`}
              />

              {/* Label */}
              <span className="font-medium text-sm flex-1">{table.label}</span>

              {/* QR URL copy */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyUrl(table.id)}
                className="gap-1.5"
              >
                {copiedId === table.id ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Bağlantı</span>
              </Button>

              {/* QR Code link */}
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(getTableUrl(table.id))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-1.5"
                  title={`QR: ${table.label}`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">QR — {table.label}</span>
                </a>
              </Button>

              {/* Toggle status */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleStatus(table)}
              >
                {table.status === "active" ? (
                  <ToggleRight className="w-5 h-5 text-green-500" />
                ) : (
                  <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                )}
              </Button>

              {/* Delete */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(table.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
