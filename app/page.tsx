import Link from "next/link";
import {
  LogIn,
  ArrowRight,
  QrCode,
  Languages,
  Smartphone,
  Settings,
  X,
  AlertCircle,
  Palette,
  Receipt,
  Printer,
  ScanBarcode,
  LayoutGrid,
  Monitor,
  Globe,
  Cloud,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const WA = "https://wa.me/905338402051?text=";
const WA_KURULUM = `${WA}${encodeURIComponent("Merhaba, restoranım için QR menü ve otomasyon sistemi kurulumuna başlamak istiyorum. 5 dakikada kurulum sürecini başlatabilir miyiz?")}`;
const WA_DIJITALLESTIR = `${WA}${encodeURIComponent("Merhaba, restoranım için QR Dijital Menü ve restoran otomasyon sistemi hakkında bilgi almak istiyorum. Detayları paylaşabilir misiniz?")}`;
const WA_HEMEN_BASVUR = `${WA}${encodeURIComponent("Merhaba, Lezzet-i Âlâ QR Menü ve Restoran Otomasyon Sistemi için başvuru yapmak istiyorum. Restoranımı dijitalleştirmek istiyorum. Süreç hakkında bilgi alabilir miyim?")}`;

const FAQ_ITEMS = [
  {
    q: "QR menü sistemi nedir?",
    a: "QR menü, müşterilerinizin telefonlarıyla QR kodu okutup restoran menünüze anında ulaşmasını sağlayan dijital menü çözümüdür. Basılı menü maliyetini sıfırlar.",
  },
  {
    q: "Restoran otomasyon sistemi ne işe yarar?",
    a: "Sipariş alma, adisyon yönetimi, fiş yazdırma, barkod okutma ve masa takibi gibi tüm restoran operasyonlarını tek panelden yönetmenizi sağlar.",
  },
  {
    q: "Kurulum ne kadar sürer?",
    a: "5 dakika. Teknik bilgi gerekmez. Menünüzü yükleyin, QR kodunuzu alın, hemen kullanmaya başlayın.",
  },
  {
    q: "Fiş yazıcı ve barkod okuyucu ile çalışır mı?",
    a: "Evet. Termal fiş yazıcılar ve barkod okuyucularla tam entegrasyon sağlanır.",
  },
  {
    q: "Çoklu dil desteği var mı?",
    a: "Evet. Türkçe ve İngilizce dil desteği mevcuttur. Yabancı misafirler menüyü kendi dillerinde görür.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Nav ── */}
      <nav className="w-full flex items-center justify-between px-5 sm:px-8 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo.svg"
            alt="Lezzet-i Âlâ QR Menü Sistemi"
            width={32}
            height={32}
            priority
          />
          <span className="text-lg font-bold tracking-tight">
            <span className="text-primary">Lezzet-i</span>{" "}
            <span className="text-foreground">Âlâ</span>
          </span>
        </div>
        <Link href="/login">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <LogIn className="w-4 h-4" />
            Giriş Yap
          </Button>
        </Link>
      </nav>

      {/* ═══ 1. HERO ═══ */}
      <section className="flex flex-col items-center justify-center px-6 pt-14 pb-16 sm:pt-24 sm:pb-28 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <QrCode className="w-3.5 h-3.5" />
          Restoran Otomasyon Yazılımı
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight leading-[1.1]">
          QR Menü ve{" "}
          <span className="text-primary">Restoran Otomasyon Sistemi</span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
          Restoran, kafe ve işletmeler için QR menü, adisyon programı,
          fiş yazıcı entegrasyonu ve barkodlu satış sistemi.
          Kurulum 5 dakika. Teknik bilgi gerekmez.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row gap-3 w-full max-w-sm sm:max-w-md">
          <Link
            href="https://lezzet-i-ala-qr.vercel.app/menu/kebapci"
            target="_blank"
            className="flex-1"
          >
            <Button
              variant="outline"
              className="w-full h-12 text-base gap-2"
              size="lg"
            >
              Canlı QR Menü Örneğini Gör
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href={WA_KURULUM} target="_blank" className="flex-1">
            <Button className="w-full h-12 text-base gap-2" size="lg">
              5 Dakikada Kurulumu Başlat
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Ücretsiz demo&ensp;•&ensp;5 dk kurulum&ensp;•&ensp;Sürekli destek
        </p>
      </section>

      {/* ═══ 2. PROBLEM ═══ */}
      <section className="px-6 py-16 sm:py-20 bg-muted/50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Basılı Menüler ve Eski Sistemler Yeterli Değil
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Restoranınız hala eski yöntemlerle mi çalışıyor?
          </p>
          <div className="mt-8 grid gap-3 max-w-md mx-auto text-left">
            {[
              { icon: X, text: "Menü güncellemesi pahalı ve yavaş" },
              { icon: AlertCircle, text: "Adisyon hataları, kayıp siparişler" },
              { icon: Languages, text: "Çoklu dil desteği yok — yabancı müşteri kaybediyorsunuz" },
              { icon: X, text: "Fiş yazıcı ve barkod entegrasyonu yok" },
              { icon: AlertCircle, text: "Modern görünmüyor, müşteri deneyimi zayıf" },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-3 bg-background rounded-xl px-4 py-3 shadow-sm border border-border/60"
              >
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-destructive" />
                </div>
                <span className="text-sm font-medium text-foreground">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 3. ÇÖZÜM ═══ */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            <span className="text-primary">Lezzet-i Âlâ</span> ile Dijitalleşin
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
            QR dijital menü, restoran otomasyon ve cafe yönetimi tek platformda.
          </p>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                icon: QrCode,
                title: "QR Menü Sistemi",
                desc: "Müşteriler telefonunu okutup menüye anında ulaşır.",
              },
              {
                icon: Languages,
                title: "TR / EN Çoklu Dil Desteği",
                desc: "Yabancı misafirler İngilizce menü görebilir.",
              },
              {
                icon: Smartphone,
                title: "Mobil Uyumlu Tasarım",
                desc: "Her ekranda mükemmel görünen restoran menüsü.",
              },
              {
                icon: Settings,
                title: "Kolay Yönetim Paneli",
                desc: "Ürün, kategori ve fiyatları anında güncelleyin.",
              },
              {
                icon: Palette,
                title: "Özel Domain & Özelleştirme",
                desc: "Kendi domaininizi bağlayın, menünüzü markanıza uyarlayın.",
              },
              {
                icon: Printer,
                title: "Fiş Yazıcı Entegrasyonu",
                desc: "Termal fiş yazıcılarla mutfak ve kasa fişi otomatik çıkar.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="text-left bg-background rounded-2xl border border-border/60 p-5 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 4. OTOMASYON ÖZELLİKLERİ ═══ */}
      <section className="px-6 py-16 sm:py-20 bg-muted/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Restoran Otomasyon Özellikleri
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Adisyon programı, POS sistemi ve cafe otomasyon — hepsi tek yerde.
          </p>
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: QrCode, label: "QR Menü Sistemi" },
              { icon: Receipt, label: "Adisyon Yönetimi" },
              { icon: Printer, label: "Fiş Yazıcı Entegrasyonu" },
              { icon: ScanBarcode, label: "Barkod Okuyucu" },
              { icon: LayoutGrid, label: "Masa Takip Sistemi" },
              { icon: Monitor, label: "Mobil POS Uyumu" },
              { icon: Globe, label: "Çoklu Dil Desteği" },
              { icon: Cloud, label: "Bulut Tabanlı Altyapı" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 bg-background rounded-xl p-4 border border-border/60 shadow-sm"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-medium text-foreground text-center leading-tight">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 5. NASIL ÇALIŞIR ═══ */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Restoranınızda Kaos Bitiyor
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Sipariş, adisyon, mutfak fişi — hepsi otomatik.
          </p>
          <div className="mt-10 grid gap-4 max-w-lg mx-auto text-left">
            {[
              {
                step: "1",
                title: "Müşteri QR kodu okutur",
                desc: "Dijital menü anında telefonda açılır.",
              },
              {
                step: "2",
                title: "Garson sipariş alır",
                desc: "Sistem otomatik adisyon oluşturur. Hata sıfır.",
              },
              {
                step: "3",
                title: "Mutfak fişi çıkar",
                desc: "Fiş yazıcı entegrasyonu ile mutfağa anında iletilir.",
              },
              {
                step: "4",
                title: "Kasada barkod okutulur",
                desc: "Hızlı ödeme. Barkodlu satış sistemi ile kayıp sıfır.",
              },
            ].map(({ step, title, desc }) => (
              <div
                key={step}
                className="flex items-start gap-4 bg-background rounded-xl p-4 border border-border/60 shadow-sm"
              >
                <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                  {step}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm font-medium text-foreground">
            Hepsi tek panelde. Restoran yazılımı bu kadar kolay.
          </p>
        </div>
      </section>

      {/* ═══ 6. GÜVEN / REFERANS ═══ */}
      <section className="px-6 py-14 sm:py-20 bg-muted/50">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Restoranlar Dijital Menüye Geçiyor
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            QR menü sistemi ve restoran otomasyon yazılımı ile
            işletmenizi bir adım öne taşıyın.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {[
              "✅ Hızlı kurulum",
              "✅ 7/24 destek",
              "✅ Bulut tabanlı",
              "✅ Türkçe arayüz",
            ].map((item) => (
              <span
                key={item}
                className="bg-background border border-border/60 rounded-full px-4 py-2 text-xs font-medium text-foreground shadow-sm"
              >
                {item}
              </span>
            ))}
          </div>
          <Link href={WA_DIJITALLESTIR} target="_blank" className="inline-block mt-8">
            <Button className="h-12 px-8 text-base gap-2" size="lg">
              Restoranımı Dijitalleştir
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ═══ 7. SSS ═══ */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center">
            Sıkça Sorulan Sorular
          </h2>
          <div className="mt-10 grid gap-3">
            {FAQ_ITEMS.map(({ q, a }) => (
              <details
                key={q}
                className="group bg-background rounded-xl border border-border/60 shadow-sm"
              >
                <summary className="flex items-center justify-between cursor-pointer px-5 py-4 text-sm font-semibold text-foreground list-none">
                  {q}
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-4 text-xs text-muted-foreground leading-relaxed">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 8. FINAL CTA ═══ */}
      <section className="px-6 py-20 sm:py-28 bg-muted/50">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Restoranınız Hazır mı?
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            QR menü sistemi, adisyon programı ve restoran otomasyonu
            ile işletmenizi dijitalleştirin.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={WA_HEMEN_BASVUR} target="_blank">
              <Button className="h-12 px-8 text-base gap-2" size="lg">
                5 Dakikada Kurulumu Başlat
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="h-12 px-8 text-base gap-2" size="lg">
                <LogIn className="w-4 h-4" />
                Giriş Yap
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© 2026 Powered by Prestige Yazilim</span>
          <div className="flex items-center gap-4">
            <Link href="mailto:info@lezzet.app" className="hover:text-foreground transition-colors">
              İletişim
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Giriş
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
