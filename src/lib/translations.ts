export type Lang = "tr" | "en";

export const translations = {
  tr: {
    noImage: "Görsel yok",
    soldOut: "Tükendi",
    currency: "₺",
    menuUnavailable: "Menü geçici olarak kullanılamıyor",
    menuInactiveDesc:
      "Bu restoranın menüsü şu anda aktif değil. Lütfen daha sonra tekrar kontrol edin.",
    footer: "Lezzet-i Âlâ",
  },
  en: {
    noImage: "No image",
    soldOut: "Sold Out",
    currency: "$",
    menuUnavailable: "Menu temporarily unavailable",
    menuInactiveDesc:
      "This restaurant's menu is currently inactive. Please check back later.",
    footer: "Lezzet-i Âlâ",
  },
} as const;

export type Translations = (typeof translations)[Lang];
