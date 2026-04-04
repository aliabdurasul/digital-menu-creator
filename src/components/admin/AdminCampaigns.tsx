"use client";

import { useState, useEffect, useCallback } from "react";
import type { Restaurant } from "@/types";
import type { DbCampaign, CampaignStatus } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Megaphone, Plus, Loader2, Send, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  restaurant: Restaurant;
}

const STATUS_LABELS: Record<CampaignStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Taslak", variant: "secondary" },
  scheduled: { label: "Planlandı", variant: "outline" },
  sending: { label: "Gönderiliyor", variant: "default" },
  sent: { label: "Gönderildi", variant: "default" },
  cancelled: { label: "İptal", variant: "destructive" },
};

export function AdminCampaigns({ restaurant }: Props) {
  const [campaigns, setCampaigns] = useState<DbCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchCampaigns = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false });

    setCampaigns((data as DbCampaign[]) || []);
    setLoading(false);
  }, [restaurant.id]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Megaphone className="w-5 h-5" /> Kampanyalar
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            SMS kampanyaları oluşturun ve gönderin.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Yeni Kampanya
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Yeni Kampanya</DialogTitle>
            </DialogHeader>
            <CreateCampaignForm
              restaurant={restaurant}
              onCreated={() => {
                setDialogOpen(false);
                fetchCampaigns();
                toast({ title: "Kampanya oluşturuldu" });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaign List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : campaigns.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          Henüz kampanya oluşturulmamış.
        </p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kampanya Adı</TableHead>
                <TableHead>Kanal</TableHead>
                <TableHead className="text-center">Durum</TableHead>
                <TableHead className="text-center">Gönderildi</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => {
                const statusCfg = STATUS_LABELS[c.status];
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="capitalize">{c.channel}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {c.sent_count}/{c.total_recipients}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("tr-TR")}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.status === "draft" && (
                        <SendButton campaignId={c.id} onSent={fetchCampaigns} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/* ─── Create Campaign Form ─── */
function CreateCampaignForm({
  restaurant,
  onCreated,
}: {
  restaurant: Restaurant;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [channel] = useState<"sms">("sms");
  const [segment, setSegment] = useState("all");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const handlePreview = async () => {
    setPreviewing(true);
    const res = await fetch("/api/campaigns/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId: restaurant.id,
        segment,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setPreviewCount(data.count);
    }
    setPreviewing(false);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !message.trim()) return;
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase.from("campaigns").insert({
      restaurant_id: restaurant.id,
      name: name.trim(),
      channel,
      target_segment: { segment },
      message_template: message.trim(),
      status: "draft",
      total_recipients: previewCount || 0,
      sent_count: 0,
      failed_count: 0,
    });

    setSaving(false);
    if (!error) onCreated();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Kampanya Adı</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ör: Hafta sonu indirimi"
          className="mt-1"
        />
      </div>

      {/* Channel is always SMS */}

      <div>
        <Label>Hedef Segment</Label>
        <Select value={segment} onValueChange={setSegment}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Müşteriler</SelectItem>
            <SelectItem value="new">Yeni Müşteriler</SelectItem>
            <SelectItem value="repeat">Düzenli Müşteriler (5+)</SelectItem>
            <SelectItem value="inactive">Pasif Müşteriler (30 gün)</SelectItem>
            <SelectItem value="recent">Son 7 Gün</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Preview count */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handlePreview} disabled={previewing}>
          {previewing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
          Alıcı Sayısını Gör
        </Button>
        {previewCount !== null && (
          <span className="text-sm text-muted-foreground">
            {previewCount} müşteri
          </span>
        )}
      </div>

      <div>
        <Label>Mesaj</Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Merhaba {{name}}, bu hafta sonu %20 indirim!"
          rows={4}
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Değişkenler: {"{{name}}"}, {"{{phone}}"}
        </p>
      </div>

      <Button onClick={handleSubmit} disabled={saving || !name.trim() || !message.trim()} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
        Kampanya Oluştur (Taslak)
      </Button>
    </div>
  );
}

/* ─── Send Button ─── */
function SendButton({ campaignId, onSent }: { campaignId: string; onSent: () => void }) {
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    setSending(true);
    const res = await fetch("/api/campaigns/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId }),
    });

    if (res.ok) {
      toast({ title: "Kampanya gönderiliyor" });
      onSent();
    } else {
      toast({ title: "Hata", description: "Gönderim başarısız", variant: "destructive" });
    }
    setSending(false);
  };

  return (
    <Button size="sm" variant="outline" onClick={handleSend} disabled={sending}>
      {sending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
      Gönder
    </Button>
  );
}
