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
  title: "Lezzet-i Âlâ",
  description:
    "Restoranınız için modern dijital menü sistemi. Kolayca yönetin, özelleştirin ve paylaşın.",
  openGraph: {
    title: "Lezzet-i Âlâ",
    description:
      "Restoranınız için modern dijital menü sistemi. Kolayca yönetin, özelleştirin ve paylaşın.",
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
      </head>
      <body className={`${plusJakartaSans.variable} font-sans`}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
