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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const WA = "https://wa.me/905338402051?text=";
const WA_BASVURU_YAP = `${WA}${encodeURIComponent("Merhaba, Lezzet-i Âlâ dijital menü sistemine başvuru yapmak istiyorum. Restoran bilgilerimi paylaşmaya hazırım.")}`;
const WA_DIJITALLESTIR = `${WA}${encodeURIComponent("Merhaba, restoranım için QR Dijital Menü sistemi hakkında bilgi almak ve kuruluma başlamak istiyorum. Detayları paylaşabilir misiniz?")}`;
const WA_HEMEN_BASVUR = `${WA}${encodeURIComponent("Merhaba, Lezzet-i Âlâ Dijital Menü Sistemi için başvuru yapmak istiyorum. Restoranımı dijitalleştirmek istiyorum. Süreç hakkında bilgi alabilir miyim?")}`;

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Nav ── */}
      <nav className="w-full flex items-center justify-between px-5 sm:px-8 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo.svg"
            alt="Lezzet-i Âlâ"
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

      {/* ── Hero ── */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-16 sm:pt-20 sm:pb-24 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <QrCode className="w-3.5 h-3.5" />
          Dijital Menü Sistemi
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
          Restoranınız İçin{" "}
          <span className="text-primary">Modern QR Menü</span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-lg leading-relaxed">
          Müşterileriniz menünüze saniyeler içinde ulaşsın.
          Siz sadece işletmenize odaklanın.
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
              Demo İncele
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href={WA_BASVURU_YAP} target="_blank" className="flex-1">
            <Button className="w-full h-12 text-base gap-2" size="lg">
              Başvuru Yap
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Hızlı kurulum&ensp;•&ensp;Sürekli destek
        </p>
      </section>

      {/* ── Problem ── */}
      <section className="px-6 py-16 sm:py-20 bg-muted/50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Basılı Menüler Artık Yeterli Değil
          </h2>
          <div className="mt-8 grid gap-4 max-w-md mx-auto text-left">
            {[
              { icon: X, text: "Güncellemesi zor" },
              { icon: Languages, text: "Çoklu dil desteği yok" },
              { icon: AlertCircle, text: "Modern görünmüyor" },
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

      {/* ── Solution ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            <span className="text-primary">Lezzet-i Âlâ</span> ile Dijitalleşin
          </h2>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                icon: QrCode,
                title: "QR Kod ile Anında Erişim",
                desc: "Müşteriler telefonunu okutup menüye ulaşır.",
              },
              {
                icon: Languages,
                title: "TR / EN Dil Desteği",
                desc: "Yabancı misafirler İngilizce menü görebilir.",
              },
              {
                icon: Smartphone,
                title: "Mobil Uyumlu Tasarım",
                desc: "Her ekranda mükemmel görünen menü.",
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

      {/* ── Social proof CTA ── */}
      <section className="px-6 py-14 sm:py-20 bg-muted/50">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-xl sm:text-2xl font-bold tracking-tight">
            Restoranlar artık dijital menüye geçiyor.
          </p>
          <Link href={WA_DIJITALLESTIR} target="_blank" className="inline-block mt-6">
            <Button className="h-12 px-8 text-base gap-2" size="lg">
              Restoranımı Dijitalleştir
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-6 py-20 sm:py-28">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Restoranınız Hazır mı?
          </h2>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={WA_HEMEN_BASVUR} target="_blank">
              <Button className="h-12 px-8 text-base gap-2" size="lg">
                Hemen Başvur
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
          <span>Powered by PrestigeYazilim</span>
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
