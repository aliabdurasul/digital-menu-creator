/** All gated feature keys in the system */
export type FeatureKey =
  | "custom_domain"
  | "translations"
  | "advanced_analytics"
  | "priority_support"
  | "custom_branding"
  | "api_access"
  | "table_ordering"
  | "crm"
  | "notifications"
  | "loyalty"
  | "campaigns"
  | "ar_menu";

export type PlanType = "basic" | "pro";
export type ModuleType = "cafe" | "restaurant";

/** Map of features → metadata */
export interface FeatureDef {
  key: FeatureKey;
  label: string;
  description: string;
  /** Plans that include this feature */
  plans: PlanType[];
  /** If set, feature is only available for this module type */
  moduleOnly?: ModuleType;
}

export const FEATURE_MAP: Record<FeatureKey, FeatureDef> = {
  custom_domain: {
    key: "custom_domain",
    label: "Özel Alan Adı",
    description: "Kendi alan adınızla menü yayınlayın",
    plans: ["pro"],
  },
  translations: {
    key: "translations",
    label: "Çoklu Dil Desteği",
    description: "Menünüzü birden fazla dilde sunun",
    plans: ["pro"],
  },
  advanced_analytics: {
    key: "advanced_analytics",
    label: "Gelişmiş Analitik",
    description: "Detaylı ziyaretçi ve menü istatistikleri",
    plans: ["pro"],
  },
  priority_support: {
    key: "priority_support",
    label: "Öncelikli Destek",
    description: "Hızlı yanıt süresi ile destek",
    plans: ["pro"],
  },
  custom_branding: {
    key: "custom_branding",
    label: "Özel Markalama",
    description: "Lezzet-i Âlâ logosunu kaldırın",
    plans: ["pro"],
  },
  api_access: {
    key: "api_access",
    label: "API Erişimi",
    description: "Programatik erişim ve entegrasyonlar",
    plans: ["pro"],
  },
  table_ordering: {
    key: "table_ordering",
    label: "Masada Sipariş",
    description: "Müşteriler masadan QR ile sipariş versin",
    plans: ["pro"],
  },
  crm: {
    key: "crm",
    label: "CRM Müşteri Yönetimi",
    description: "Müşteri kaydı, segmentasyon ve geçmiş takibi",
    plans: ["pro"],
  },
  notifications: {
    key: "notifications",
    label: "SMS Bildirimleri",
    description: "Otomatik sipariş bildirimleri gönderimi",
    plans: ["pro"],
  },
  loyalty: {
    key: "loyalty",
    label: "Sadakat Programı",
    description: "Damga kartı ve ödül takibi",
    plans: ["pro"],
    moduleOnly: "cafe",
  },
  campaigns: {
    key: "campaigns",
    label: "Kampanya Yönetimi",
    description: "Toplu SMS kampanyaları gönderimi",
    plans: ["pro"],
  },
  ar_menu: {
    key: "ar_menu",
    label: "AR Menü",
    description: "3D artırılmış gerçeklik ile ürün görüntüleme",
    plans: ["pro"],
  },
};

/**
 * All feature keys the given plan has access to.
 */
export function getFeaturesForPlan(plan: PlanType): FeatureKey[] {
  return (Object.values(FEATURE_MAP) as FeatureDef[])
    .filter((f) => f.plans.includes(plan))
    .map((f) => f.key);
}
