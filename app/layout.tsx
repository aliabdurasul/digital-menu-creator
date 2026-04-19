import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://lezzetiala.prestigeyazilim.app"
  ),
  title: "Dijital Restoran Deneyimi | 3D AR QR Menü, Sipariş ve Sadakat Programı",
  description:
    "Restoran ve kafeler için dijital menü, masadan sipariş ve sadakat programı. QR kod okutarak anında menüye ulaşın. 5 dakikada kurulum.",
  keywords: [
    "qr menü sistemi",
    "dijital menü",
    "qr menü",
    "restoran dijital menü",
    "kafe qr menü",
    "mobil menü",
    "restoran otomasyon",
    "adisyon programı",
    "fiş yazıcı entegrasyonu",
    "barkodlu satış sistemi",
  ],
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Dijital Restoran Deneyimi | QR Menü, Sipariş ve Ödüller",
    description:
      "Restoran ve kafeler için dijital menü, masadan sipariş ve sadakat programı. 5 dakikada kurulum.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Dijital Menü" />
        {/* PWA: redirect to last visited restaurant when opened in standalone mode */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;if(s){var p=localStorage.getItem('last_menu_path');if(p&&p.startsWith('/r/')&&window.location.pathname==='/'){window.location.replace(p);}}}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Dijital Restoran Deneyimi",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description:
                "Restoran, kafe ve işletmeler için QR menü ve dijital menü sistemi. Müşteriler QR kodu okutarak menüye anında ulaşır.",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "TRY",
                availability: "https://schema.org/InStock",
              },
            }),
          }}
        />
      </head>
      <body className={`${plusJakartaSans.variable} font-sans`}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
