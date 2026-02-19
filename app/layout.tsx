import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Digital Menu",
  description:
    "Beautiful digital menus for modern restaurants. Manage, customize, and share with ease.",
  openGraph: {
    title: "Digital Menu",
    description:
      "Beautiful digital menus for modern restaurants. Manage, customize, and share with ease.",
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakartaSans.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
