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
  title: "QR Menü Sistemi | Restoran Otomasyon ve Dijital Menü Yazılımı",
  description:
    "Restoran, kafe ve işletmeler için QR menü sistemi, adisyon programı, fiş yazıcı ve barkod entegrasyonu. Mobil uyumlu restoran otomasyon yazılımı.",
  keywords: [
    "qr menü sistemi",
    "restoran otomasyon",
    "adisyon programı",
    "cafe otomasyon",
    "barkodlu satış sistemi",
    "fiş yazıcı entegrasyonu",
    "restoran yazılımı",
    "dijital menü",
    "pos sistemi",
    "masa takip sistemi",
  ],
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "QR Menü Sistemi | Restoran Otomasyon ve Dijital Menü Yazılımı",
    description:
      "Restoran, kafe ve işletmeler için QR menü sistemi, adisyon programı, fiş yazıcı ve barkod entegrasyonu. Mobil uyumlu restoran otomasyon yazılımı.",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Lezzet-i Âlâ QR Menü",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description:
                "Restoran ve kafe için QR menü sistemi, adisyon programı ve restoran otomasyon yazılımı.",
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
