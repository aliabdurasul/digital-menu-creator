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
  title: "Coffee Club | Dijital Menü — Sipariş ve Ödüller",
  description:
    "Restoran, kafe ve işletmeler için QR menü sistemi ve dijital menü çözümü. Müşteriler QR kodu okutarak menüye anında ulaşır. 5 dakikada kurulum, teknik bilgi gerekmez. Gelecekte tam restoran otomasyonu.",
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
    title: "Coffee Club | Dijital Menü — Sipariş ve Ödüller",
    description:
      "Restoran, kafe ve işletmeler için QR menü sistemi ve dijital menü çözümü. 5 dakikada kurulum, teknik bilgi gerekmez.",
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
        <meta name="apple-mobile-web-app-title" content="Coffee Club" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Coffee Club",
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
