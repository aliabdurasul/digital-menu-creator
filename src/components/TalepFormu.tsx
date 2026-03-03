"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

const ISLETME_TIPLERI = [
  "Restoran",
  "Kafe",
  "Market",
  "Pastane / Fırın",
  "Fast Food",
  "Otel",
  "Diğer",
];

const MODUL_SECENEKLERI = [
  "Adisyon Yönetimi",
  "Fiş Yazıcı Entegrasyonu",
  "Barkod Okuyucu",
  "Masa Takip Sistemi",
  "Mobil POS",
  "Çoklu Dil Desteği",
  "Özel Domain",
];

export default function TalepFormu() {
  const [form, setForm] = useState({
    restoranAdi: "",
    yetkili: "",
    telefon: "",
    eposta: "",
    isletmeTipi: "",
    moduller: [] as string[],
    notlar: "",
  });
  const [gonderildi, setGonderildi] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState("");

  function toggleModul(m: string) {
    setForm((prev) => ({
      ...prev,
      moduller: prev.moduller.includes(m)
        ? prev.moduller.filter((x) => x !== m)
        : [...prev.moduller, m],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setHata("");
    setYukleniyor(true);

    try {
      const res = await fetch("/api/talep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Bir hata oluştu.");
      }

      setGonderildi(true);
    } catch (err) {
      setHata(
        err instanceof Error ? err.message : "Bir hata oluştu. Lütfen tekrar deneyin."
      );
    } finally {
      setYukleniyor(false);
    }
  }

  if (gonderildi) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-bold text-foreground">
          Talebiniz Başarıyla Gönderildi!
        </h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          En kısa sürede size özel çözüm planımızla iletişime geçeceğiz.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => {
            setGonderildi(false);
            setForm({
              restoranAdi: "",
              yetkili: "",
              telefon: "",
              eposta: "",
              isletmeTipi: "",
              moduller: [],
              notlar: "",
            });
          }}
        >
          Yeni Talep Oluştur
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 text-left">
      {/* Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            Restoran / İşletme Adı <span className="text-destructive">*</span>
          </label>
          <input
            required
            type="text"
            placeholder="Örn: Lezzet Cafe"
            value={form.restoranAdi}
            onChange={(e) =>
              setForm((p) => ({ ...p, restoranAdi: e.target.value }))
            }
            className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            Yetkili Kişi / İsim <span className="text-destructive">*</span>
          </label>
          <input
            required
            type="text"
            placeholder="Ad Soyad"
            value={form.yetkili}
            onChange={(e) =>
              setForm((p) => ({ ...p, yetkili: e.target.value }))
            }
            className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            Telefon <span className="text-destructive">*</span>
          </label>
          <input
            required
            type="tel"
            placeholder="0 (5XX) XXX XX XX"
            value={form.telefon}
            onChange={(e) =>
              setForm((p) => ({ ...p, telefon: e.target.value }))
            }
            className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            E-posta
          </label>
          <input
            type="email"
            placeholder="ornek@restoran.com"
            value={form.eposta}
            onChange={(e) =>
              setForm((p) => ({ ...p, eposta: e.target.value }))
            }
            className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* İşletme Tipi */}
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">
          İşletme Tipi <span className="text-destructive">*</span>
        </label>
        <select
          required
          value={form.isletmeTipi}
          onChange={(e) =>
            setForm((p) => ({ ...p, isletmeTipi: e.target.value }))
          }
          className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none cursor-pointer"
        >
          <option value="" disabled>
            Seçiniz...
          </option>
          {ISLETME_TIPLERI.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Modüller */}
      <div>
        <label className="block text-xs font-semibold text-foreground mb-2.5">
          İstediğiniz Modüller
        </label>
        <div className="flex flex-wrap gap-2">
          {MODUL_SECENEKLERI.map((m) => {
            const selected = form.moduller.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggleModul(m)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-all duration-150 ${
                  selected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {selected && "✓ "}
                {m}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ek Notlar */}
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">
          Ek Notlar
        </label>
        <textarea
          rows={3}
          placeholder="Projeniz hakkında eklemek istedikleriniz..."
          value={form.notlar}
          onChange={(e) => setForm((p) => ({ ...p, notlar: e.target.value }))}
          className="w-full px-3.5 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
        />
      </div>

      {/* Hata mesajı */}
      {hata && (
        <p className="text-sm text-destructive text-center bg-destructive/10 rounded-lg px-4 py-2">
          {hata}
        </p>
      )}

      {/* Submit */}
      <Button
        type="submit"
        size="lg"
        className="w-full h-12 text-base gap-2 mt-1"
        disabled={yukleniyor}
      >
        {yukleniyor ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Gönderiliyor...
          </>
        ) : (
          <>
            Talebimi Gönder
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center -mt-2">
        Bilgileriniz gizli tutulur ve yalnızca teklif oluşturmak için kullanılır.
      </p>
    </form>
  );
}
