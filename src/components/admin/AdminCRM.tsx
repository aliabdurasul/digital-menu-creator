"use client";

import { useState, useEffect, useCallback } from "react";
import type { Restaurant } from "@/types";
import type { DbCustomer } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/dialog";
import { Search, Users, ChevronLeft, ChevronRight, Loader2, Phone, Award, ShoppingBag } from "lucide-react";

const TIER_COLORS: Record<string, string> = {
  bronze: "bg-orange-100 text-orange-700",
  silver: "bg-gray-100 text-gray-700",
  gold: "bg-yellow-100 text-yellow-700",
  vip: "bg-purple-100 text-purple-700",
};

interface Props {
  restaurant: Restaurant;
}

const SEGMENTS = [
  { value: "all", label: "Tümü" },
  { value: "new", label: "Yeni" },
  { value: "loyal", label: "Sadık (5+)" },
  { value: "inactive", label: "Pasif (30 gün)" },
  { value: "vip", label: "VIP" },
];

export function AdminCRM({ restaurant }: Props) {
  const [customers, setCustomers] = useState<DbCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<DbCustomer | null>(null);
  const limit = 20;

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      restaurantId: restaurant.id,
      search,
      segment,
      page: String(page),
      limit: String(limit),
    });

    const res = await fetch(`/api/customers?${params}`);
    if (res.ok) {
      const data = await res.json();
      setCustomers(data.customers);
      setTotal(data.total);
    }
    setLoading(false);
  }, [restaurant.id, search, segment, page]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, segment]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="w-5 h-5" /> Müşteriler
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Toplam {total} müşteri
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="İsim veya telefon ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={segment} onValueChange={setSegment}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Segment" />
          </SelectTrigger>
          <SelectContent>
            {SEGMENTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : customers.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Müşteri bulunamadı.</p>
      ) : (
        <>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead className="text-center">Sipariş</TableHead>
                  <TableHead className="text-right">Toplam</TableHead>
                  <TableHead className="text-center">Seviye</TableHead>
                  <TableHead>Son Ziyaret</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedCustomer(c)}
                  >
                    <TableCell className="font-medium">
                      {c.name || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {c.phone}
                    </TableCell>
                    <TableCell className="text-center">
                      {c.total_orders}
                    </TableCell>
                    <TableCell className="text-right">
                      ₺{Number(c.total_spent).toFixed(0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`text-xs ${TIER_COLORS[c.loyalty_tier] || ""}`}>
                        {c.loyalty_tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(c.last_visit).toLocaleDateString("tr-TR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Sayfa {page} / {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Customer Detail Dialog */}
      <CustomerDetailDialog
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        onUpdate={fetchCustomers}
      />
    </div>
  );
}

/* ─── Customer Detail Dialog ─── */
function CustomerDetailDialog({
  customer,
  onClose,
  onUpdate,
}: {
  customer: DbCustomer | null;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) setName(customer.name || "");
  }, [customer]);

  const handleSave = async () => {
    if (!customer) return;
    setSaving(true);
    await fetch("/api/customers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: customer.id, name }),
    });
    setSaving(false);
    onUpdate();
    onClose();
  };

  if (!customer) return null;

  return (
    <Dialog open={!!customer} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Müşteri Detayı</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Phone */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Phone className="w-5 h-5 text-muted-foreground" />
            <span className="font-mono">{customer.phone}</span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg border">
              <ShoppingBag className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <div className="text-lg font-bold">{customer.total_orders}</div>
              <div className="text-xs text-muted-foreground">Sipariş</div>
            </div>
            <div className="text-center p-3 rounded-lg border">
              <span className="text-lg font-bold">₺{Number(customer.total_spent).toFixed(0)}</span>
              <div className="text-xs text-muted-foreground">Toplam</div>
            </div>
            <div className="text-center p-3 rounded-lg border">
              <Award className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <Badge className={`text-xs ${TIER_COLORS[customer.loyalty_tier] || ""}`}>
                {customer.loyalty_tier}
              </Badge>
              <div className="text-xs text-muted-foreground mt-1">Seviye</div>
            </div>
          </div>

          {/* Editable name */}
          <div>
            <label className="text-sm font-medium">İsim</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Müşteri adı"
              className="mt-1"
            />
          </div>

          {/* Tags */}
          {customer.tags && customer.tags.length > 0 && (
            <div>
              <label className="text-sm font-medium">Etiketler</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {customer.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>İlk ziyaret: {new Date(customer.first_visit).toLocaleDateString("tr-TR")}</p>
            <p>Son ziyaret: {new Date(customer.last_visit).toLocaleDateString("tr-TR")}</p>
            {customer.consent_given && customer.consent_date && (
              <p>KVKK onayı: {new Date(customer.consent_date).toLocaleDateString("tr-TR")}</p>
            )}
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Kaydet
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
