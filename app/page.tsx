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
  LayoutGrid,
  Monitor,
  Globe,
  Cloud,
  ChevronDown,
  Phone,
  Shield,
  Zap,
  Send,
  UtensilsCrossed,
  ChefHat,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import TalepFormu from "@/components/TalepFormu";

const FAQ_ITEMS = [
  {
    q: "QR menü sistemi nedir?",
    a: "QR menü, müşterilerinizin telefonlarıyla QR kodu okutup restoran menünüze anında ulaşmasını sağlayan dijital menü çözümüdür. Basılı menü maliyetini sıfırlar, güncelleme anında yansır.",
  },
  {
    q: "Kurulum süreci nasıl işliyor?",
    a: "QR Menü hazır ve çalışıyor — menünüzü yükleyin, QR kodunuzu alın, hemen kullanmaya başlayın. Tam restoran otomasyonu ise her işletmeye özel çözümlerle devreye alınır.",
  },
  {
    q: "Premium özellikler neler?",
    a: "Fiş yazıcı entegrasyonu, masada sipariş sistemi, mutfak ekranı entegrasyonu, adisyon yönetimi, masa takip ve mobil POS gibi premium modüller işletmenize özel olarak devreye alınır.",
  },
  {
    q: "Çoklu dil desteği var mı?",
    a: "Evet. Türkçe ve İngilizce dil desteği mevcuttur. Yabancı misafirler menüyü kendi dillerinde görür, müşteri deneyimi artar.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 sm:px-8 py-3.5">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.svg"
              alt="Lezzet-i Âlâ QR Menü Sistemi"
              width={30}
              height={30}
              priority
            />
            <span className="text-lg font-bold tracking-tight">
              <span className="text-primary">Lezzet-i</span>{" "}
              <span className="text-foreground">Âlâ</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="#talep-formu">
              <Button size="sm" className="gap-1.5 text-xs h-8 px-3.5 hidden sm:inline-flex">
                <Send className="w-3.5 h-3.5" />
                Talep Oluştur
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground text-xs h-8">
                <LogIn className="w-3.5 h-3.5" />
                Giriş
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ 1. HERO ═══ */}
      <section className="relative overflow-hidden">
        {/* Gradient glow */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="flex flex-col items-center justify-center px-6 pt-16 pb-20 sm:pt-28 sm:pb-32 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 rounded-full mb-8 border border-primary/20">
            <QrCode className="w-3.5 h-3.5" />
            Dijital Menü Çözümleri
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08]">
            Lezzet-i Âlâ{" "}
            <span className="text-primary">QR Menü Sistemi</span>
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-muted-foreground font-medium">
            Restoran, Kafe ve İşletmeler için Dijital Menü
          </p>

          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Müşterileriniz QR kodu okutarak menünüze saniyeler içinde ulaşır.
            <span className="text-foreground font-medium"> Kurulum hızlı, kullanım kolay, teknik bilgi gerekmez.</span>
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-3 w-full max-w-md mx-auto">
            <Link
              href="https://lezzet-i-ala-qr.vercel.app/menu/kebapci"
              target="_blank"
              className="w-full sm:w-auto sm:flex-1"
            >
              <Button
                variant="outline"
                className="w-full h-12 text-sm sm:text-base gap-2 border-2"
                size="lg"
              >
                Canlı Demo
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="#talep-formu" className="w-full sm:w-auto sm:flex-1">
              <Button className="w-full h-12 text-sm sm:text-base gap-2 shadow-lg shadow-primary/20" size="lg">
                Ücretsiz Teklif Al
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-primary" /> Hızlı Kurulum</span>
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-primary" /> Güvenli Altyapı</span>
            <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-primary" /> Çoklu Dil</span>
          </div>
        </div>
      </section>

      {/* ═══ 2. PROBLEM ═══ */}
      <section className="px-6 py-16 sm:py-24 bg-muted/40">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Sorunlar</p>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
            Basılı Menüler Artık Yeterli Değil
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
            Restoranınız hâlâ eski yöntemlerle mi çalışıyor?
          </p>
          <div className="mt-10 grid gap-3 max-w-lg mx-auto text-left">
            {[
              { icon: X, text: "Menü güncellemesi pahalı ve yavaş" },
              { icon: AlertCircle, text: "Adisyon hataları, kayıp siparişler" },
              { icon: Languages, text: "Çoklu dil desteği yok — yabancı müşteri kaybediyorsunuz" },
              { icon: AlertCircle, text: "Modern görünmüyor, müşteri deneyimi zayıf" },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-3.5 bg-background rounded-xl px-5 py-3.5 shadow-sm border border-border/50 hover:border-destructive/30 transition-colors duration-200"
              >
                <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-destructive" />
                </div>
                <span className="text-sm font-medium text-foreground">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 3. ÇÖZÜM — QR Menü Odaklı ═══ */}
      <section className="px-6 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Çözüm</p>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
            <span className="text-primary">Lezzet-i Âlâ</span> ile Dijitalleşin
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
            QR Menü ve Basit Restoran Yönetimi Tek Platformda
          </p>

          {/* ── Öne Çıkan: QR Menü ── */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                icon: QrCode,
                title: "QR Menü Sistemi",
                desc: "Müşteriler telefonunu okutup menüye anında ulaşır. Basım maliyeti sıfır.",
              },
              {
                icon: Languages,
                title: "TR / EN Çoklu Dil Desteği",
                desc: "Yabancı misafirler İngilizce menü görebilir. Turist bölgeleri için ideal.",
              },
              {
                icon: Smartphone,
                title: "Mobil Uyumlu Tasarım",
                desc: "Her ekranda mükemmel görünen, hızlı yüklenen restoran menüsü.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group text-left bg-background rounded-2xl border-2 border-primary/15 p-6 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-base font-bold text-foreground">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>

          {/* ── Yönetim & Entegrasyon — Premium ── */}
          <div className="mt-14">
            <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/10 to-primary/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold px-3.5 py-1 rounded-full mb-5 border border-amber-500/20">
              <Crown className="w-3 h-3" />
              Premium
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">
              Yönetim & Entegrasyon
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                {
                  icon: Settings,
                  title: "Kolay Yönetim Paneli",
                  desc: "Ürün, kategori ve fiyatları anında güncelleyin.",
                },
                {
                  icon: Palette,
                  title: "Özel Domain & Özelleştirme",
                  desc: "Kendi domaininizi bağlayın, markanıza uyarlayın.",
                },
                {
                  icon: Printer,
                  title: "Fiş Yazıcı Entegrasyonu",
                  desc: "Termal fiş yazıcılarla mutfak ve kasa fişi.",
                },
                {
                  icon: UtensilsCrossed,
                  title: "Masada Sipariş Sistemi",
                  desc: "Müşteriler masadan sipariş verir, mutfağa anında iletilir.",
                },
                {
                  icon: ChefHat,
                  title: "Mutfak Ekranı Entegrasyonu",
                  desc: "Siparişler mutfak ekranına düşer, takip ve hazırlık kolaylaşır.",
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="text-left bg-gradient-to-b from-amber-50/50 to-background dark:from-amber-950/10 dark:to-background rounded-xl border border-amber-200/30 dark:border-amber-800/20 p-4 hover:border-amber-300/50 hover:shadow-md transition-all duration-200"
                >
                  <div className="w-9 h-9 rounded-lg bg-amber-100/60 dark:bg-amber-900/20 border border-amber-200/40 dark:border-amber-800/30 flex items-center justify-center mb-2.5">
                    <Icon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-xs font-bold text-foreground">{title}</h3>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 4. OTOMASYON MODÜLLERİ — PREMIUM ═══ */}
      <section className="px-6 py-16 sm:py-24 bg-muted/40">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/10 to-primary/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold px-3.5 py-1 rounded-full mb-5 border border-amber-500/20">
            <Crown className="w-3 h-3" />
            Premium
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
            Tam Restoran Otomasyonu
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
            QR Menü&apos;nüze ek olarak premium çözümlerle
            tam otomasyon devreye alınır.
          </p>
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {([
              { icon: QrCode, label: "QR Menü Sistemi", active: true },
              { icon: Receipt, label: "Adisyon Yönetimi", active: false },
              { icon: Printer, label: "Fiş Yazıcı Entegrasyonu", active: false },
              { icon: UtensilsCrossed, label: "Masada Sipariş", active: false },
              { icon: ChefHat, label: "Mutfak Ekranı", active: false },
              { icon: LayoutGrid, label: "Masa Takip Sistemi", active: false },
              { icon: Monitor, label: "Mobil POS Uyumu", active: false },
              { icon: Globe, label: "Çoklu Dil Desteği", active: true },
              { icon: Cloud, label: "Bulut Tabanlı Altyapı", active: true },
            ] as const).map(({ icon: Icon, label, active }) => (
              <div
                key={label}
                className={`relative flex flex-col items-center gap-2.5 rounded-xl p-5 border transition-all duration-200 ${
                  active
                    ? "bg-background border-primary/20 shadow-sm"
                    : "bg-gradient-to-b from-amber-50/50 to-background dark:from-amber-950/10 dark:to-background border-amber-200/30 dark:border-amber-800/20 hover:border-amber-300/50 hover:shadow-md"
                }`}
              >
                {!active && (
                  <span className="absolute -top-2.5 right-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                    Premium
                  </span>
                )}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  active ? "bg-primary/10" : "bg-amber-100/60 dark:bg-amber-900/20"
                }`}>
                  <Icon className={`w-5 h-5 ${active ? "text-primary" : "text-amber-600 dark:text-amber-400"}`} />
                </div>
                <span className="text-xs font-semibold text-foreground text-center leading-tight">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 5. 3 ADIMDA DİJİTAL MENÜ ═══ */}
      <section className="px-6 py-16 sm:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Nasıl Çalışır</p>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
            3 Adımda Dijital Menünüz Hazır
          </h2>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto text-left">
            {[
              {
                step: "1",
                title: "Menünü Oluştur",
                desc: "Restoran menünü sisteme ekle. Kategoriler, ürünler ve fiyatlar birkaç dakika içinde hazır.",
              },
              {
                step: "2",
                title: "QR Kodunu İndir ve Masalara Yerleştir",
                desc: "Sistem otomatik olarak sana özel QR kodu oluşturur. İndir, yazdır ve masalara yerleştir.",
              },
              {
                step: "3",
                title: "Müşteriler Anında Erişsin",
                desc: "Müşteriler QR kodu okutur ve menün telefonlarında anında açılır. Çoklu dil desteği sayesinde herkes rahatça inceleyebilir.",
              },
            ].map(({ step, title, desc }) => (
              <div
                key={step}
                className="relative bg-background rounded-2xl p-6 border border-border/50 shadow-sm text-center"
              >
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  {step}
                </div>
                <h3 className="text-base font-bold text-foreground">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 6. GÜVEN ═══ */}
      <section className="px-6 py-16 sm:py-24 bg-muted/40">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Neden Biz?</p>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
            Güvenilir Dijital Altyapı
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            QR menü sistemi ile işletmenizi bir adım öne taşıyın.
          </p>
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Zap, label: "Hızlı Kurulum" },
              { icon: Phone, label: "7/24 Destek" },
              { icon: Cloud, label: "Bulut Tabanlı" },
              { icon: Shield, label: "Güvenli & Türkçe" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-3 bg-background rounded-xl p-5 border border-border/50 shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">{label}</span>
              </div>
            ))}
          </div>
          <Link href="#talep-formu" className="inline-block mt-10">
            <Button className="h-12 px-8 text-base gap-2 shadow-lg shadow-primary/20" size="lg">
              Restoranımı QR Menü ile Dijitalleştir
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ═══ 7. SSS ═══ */}
      <section className="px-6 py-16 sm:py-24">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 text-center">SSS</p>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-center">
            Sıkça Sorulan Sorular
          </h2>
          <div className="mt-10 grid gap-3">
            {FAQ_ITEMS.map(({ q, a }) => (
              <details
                key={q}
                className="group bg-background rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <summary className="flex items-center justify-between cursor-pointer px-5 py-4 sm:py-5 text-sm sm:text-base font-semibold text-foreground list-none">
                  {q}
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180 shrink-0 ml-3" />
                </summary>
                <p className="px-5 pb-4 sm:pb-5 text-sm text-muted-foreground leading-relaxed">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 8. PROFESYONEL TALEP FORMU ═══ */}
      <section id="talep-formu" className="px-6 py-16 sm:py-24 bg-muted/40 scroll-mt-20">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-[11px] font-semibold px-3 py-1 rounded-full mb-5 border border-primary/20">
              <Send className="w-3 h-3" />
              Profesyonel Talep
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              Restoranınızı Tamamen Dijitalleştirmek İster misiniz?
            </h2>
            <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
              QR Menü hazır ve çalışıyor. Tam restoran otomasyonu ise her işletmeye özel
              çözümlerle devreye alınır. Talebinizi bırakın, size özel çözüm planımızla iletişime geçelim.
            </p>
          </div>

          <div className="bg-background rounded-2xl border border-border/50 p-6 sm:p-8 shadow-lg">
            <TalepFormu />
          </div>
        </div>
      </section>

      {/* ═══ 9. FINAL CTA ═══ */}
      <section className="px-6 py-20 sm:py-28 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            QR Menü ile Restoranınız Hazır mı?
          </h2>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
            QR Menü hazır ve çalışıyor. Tam otomasyon için işletmenize özel
            çözüm planı oluşturalım.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="#talep-formu">
              <Button className="h-12 px-8 text-base gap-2 shadow-lg shadow-primary/20" size="lg">
                Ücretsiz Teklif Al
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="h-12 px-8 text-base gap-2 border-2" size="lg">
                <LogIn className="w-4 h-4" />
                Giriş Yap
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Image src="/logo.svg" alt="Lezzet-i Âlâ" width={24} height={24} />
              <span className="text-sm font-bold tracking-tight">
                <span className="text-primary">Lezzet-i</span>{" "}
                <span className="text-foreground">Âlâ</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <Link href="https://wa.me/905338402051" target="_blank" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                <Phone className="w-3 h-3" />
                +90 533 840 2051
              </Link>
              <Link href="mailto:info@prestigeyazilim.app" className="hover:text-foreground transition-colors">
                info@prestigeyazilim.app
              </Link>
              <Link href="/login" className="hover:text-foreground transition-colors">
                Giriş Yap
              </Link>
            </div>
          </div>
          <div className="mt-5 pt-5 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>© 2026 Lezzet-i Âlâ | Powered by Prestige Yazılım</span>
            <span>QR Menü ve Dijital Menü Çözümleri</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
