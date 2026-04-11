"use client";

import { useState, useEffect } from "react";
import { X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const PHONE_KEY = "customer_phone";
const CONSENT_KEY = "customer_consent";
const NAME_KEY = "customer_name";

/** Validate Turkish phone: 05xx xxx xx xx or +905xx... */
function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\s+/g, "");
  return /^(\+90|0)?5\d{9}$/.test(cleaned);
}

/** Normalize to +905XXXXXXXXX */
function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, "");
  if (cleaned.startsWith("+90")) return cleaned;
  if (cleaned.startsWith("0")) return "+9" + cleaned;
  return "+90" + cleaned;
}

interface PhoneCaptureProps {
  /** If true, the user MUST enter a phone before proceeding (cafe mode) */
  required?: boolean;
  /** If true, name field is shown and required (cafe mode) */
  requireName?: boolean;
  onSubmit: (phone: string, name?: string) => void;
  onSkip?: () => void;
}

export function PhoneCapture({ required = false, requireName = false, onSubmit, onSkip }: PhoneCaptureProps) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(true);

  // Check if phone is already captured this session
  useEffect(() => {
    const saved = sessionStorage.getItem(PHONE_KEY);
    const savedConsent = sessionStorage.getItem(CONSENT_KEY);
    if (saved && savedConsent === "true") {
      onSubmit(saved, sessionStorage.getItem(NAME_KEY) || undefined);
      setVisible(false);
    }
  }, [onSubmit]);

  if (!visible) return null;

  const handleSubmit = () => {
    if (requireName && name.trim().length < 2) {
      setError("Lütfen adınızı girin (en az 2 karakter)");
      return;
    }
    if (!phone.trim()) {
      setError("Telefon numarası gerekli");
      return;
    }
    if (!isValidPhone(phone)) {
      setError("Geçerli bir telefon numarası girin (05XX XXX XX XX)");
      return;
    }
    if (!consent) {
      setError("Devam etmek için bilgilendirmeyi onaylamanız gerekli");
      return;
    }

    const normalized = normalizePhone(phone);
    sessionStorage.setItem(PHONE_KEY, normalized);
    sessionStorage.setItem(CONSENT_KEY, "true");
    if (name.trim()) sessionStorage.setItem(NAME_KEY, name.trim());
    onSubmit(normalized, name.trim() || undefined);
    setVisible(false);
  };

  const handleSkip = () => {
    setVisible(false);
    onSkip?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-sm bg-card rounded-2xl shadow-xl border border-border overflow-hidden animate-fade-in">
        {!required && (
          <button
            type="button"
            onClick={handleSkip}
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>
        )}

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Puanlarını Koru!</h3>
              <p className="text-xs text-muted-foreground">
                📱 Telefonunu ekle → farklı cihazda puanlarını koru
              </p>
            </div>
          </div>

          {requireName && (
            <div>
              <label className="block text-sm font-medium mb-1">Adınız *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                placeholder="Adınızı girin"
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-xs">Telefon Numarası</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              placeholder="05XX XXX XX XX"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className={error ? "border-destructive" : ""}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="consent"
              checked={consent}
              onCheckedChange={(v) => {
                setConsent(!!v);
                if (v) setError("");
              }}
            />
            <label htmlFor="consent" className="text-[11px] text-muted-foreground leading-tight cursor-pointer">
              Numaramın sadakat puanlarımı eşleştirmek ve sipariş bildirimleri için kullanılmasını kabul ediyorum.
            </label>
          </div>

          <Button onClick={handleSubmit} className="w-full">
            Devam Et
          </Button>

          {!required && (
            <button
              type="button"
              onClick={handleSkip}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Şimdilik geç
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Get the captured phone from session storage */
export function getCapturedPhone(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(PHONE_KEY);
}

/** Get the captured name from session storage */
export function getCapturedName(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(NAME_KEY);
}
