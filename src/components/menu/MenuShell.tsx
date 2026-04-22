import Image from "next/image";
import type { Restaurant } from "@/types";
import { ProductList } from "@/components/menu/ProductList";
import { MenuInteractions } from "@/components/menu/MenuInteractions";
import { LanguageProvider } from "@/components/menu/LanguageProvider";
import { MenuHeroBranding } from "@/components/menu/MenuHeroBranding";
import { LanguageToggle } from "@/components/menu/LanguageToggle";
import { CoffeeClubButton } from "@/components/loyalty/CoffeeClubButton";
import { ARWarmup } from "@/components/menu/ARWarmup";
import { RestaurantIntro } from "@/components/menu/RestaurantIntro";

interface MenuShellProps {
  restaurant: Restaurant;
  restaurantEn?: Restaurant | null;
  tableId?: string;
}

/**
 * Server Component — renders the entire menu as static HTML.
 * Branches on restaurant.moduleType:
 *   "restaurant" → premium dark UI (Cormorant + Outfit, gold accent)
 *   "cafe"       → existing layout (unchanged)
 */
export function MenuShell({ restaurant, restaurantEn = null, tableId }: MenuShellProps) {
  const arModelUrls = restaurant.products
    .filter((p) => p.arModelUrl)
    .map((p) => p.arModelUrl);

  const isRestaurant = restaurant.moduleType === "restaurant";

  // ── RESTAURANT PREMIUM DARK LAYOUT ──────────────────────────────────────
  if (isRestaurant) {
    return (
      <LanguageProvider restaurantTr={restaurant} restaurantEn={restaurantEn}>
        <ARWarmup arModelUrls={arModelUrls} />

        <div
          className="restaurant-theme max-w-[480px] mx-auto min-h-screen shadow-sm"
          style={{ background: "#0a0806" }}
        >
          {/* Intro animation overlay */}
          <RestaurantIntro />

          {/* Sticky topbar */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 100,
              padding: "18px 16px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              background: "rgba(10,8,6,0.85)",
              borderBottom: "1px solid rgba(196,154,60,0.25)",
            }}
          >
            <span
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 600,
                letterSpacing: "2px",
                textTransform: "uppercase",
                fontSize: "18px",
                color: "#f5f1e8",
              }}
            >
              {restaurant.name}
            </span>
          </div>

          {/* Hero */}
          <div style={{ height: 280, position: "relative", overflow: "hidden" }}>
            {restaurant.coverImage ? (
              <Image
                src={restaurant.coverImage}
                alt={restaurant.name}
                fill
                sizes="480px"
                priority
                className="object-cover r-hero-zoom"
                style={{ filter: "brightness(0.6)" }}
              />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "#1a1410" }} />
            )}
            <div
              style={{
                position: "absolute",
                bottom: 30,
                left: 0,
                width: "100%",
                textAlign: "center",
              }}
            >
              <h1
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 36,
                  fontStyle: "italic",
                  fontWeight: 500,
                  color: "#f5f1e8",
                  textShadow: "0 2px 12px rgba(0,0,0,0.7)",
                  padding: "0 16px",
                }}
              >
                {restaurant.description || restaurant.name}
              </h1>
            </div>
          </div>

          {/* Sticky category tabs + scroll-spy */}
          <MenuInteractions />

          {/* Product list */}
          <ProductList tableId={tableId} />

          {/* Subtle footer */}
          <div style={{ textAlign: "center", paddingTop: 64, paddingBottom: 40 }}>
            <span style={{ fontSize: 10, color: "rgba(168,155,140,0.15)" }}>
              Powered by Prestige Yazilim
            </span>
          </div>
        </div>
      </LanguageProvider>
    );
  }

  // ── CAFE LAYOUT (unchanged) ──────────────────────────────────────────────
  return (
    <LanguageProvider restaurantTr={restaurant} restaurantEn={restaurantEn}>
      {/* Silently warm WebGL + preload above-fold AR models */}
      <ARWarmup arModelUrls={arModelUrls} />
      <div className="max-w-[480px] mx-auto min-h-screen bg-background shadow-sm">
        {/* Hero Cover */}
        <div className="relative w-full h-44 sm:h-56 overflow-hidden">
          {restaurant.coverImage ? (
            <Image
              src={restaurant.coverImage}
              alt={restaurant.name}
              fill
              sizes="480px"
              priority
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />

          {/* Top-left Coffee Club button */}
          <div className="absolute top-3 left-4 z-10">
            <CoffeeClubButton />
          </div>

          {/* Top-right language toggle */}
          <div className="absolute top-3 right-4 z-10">
            <LanguageToggle />
          </div>

          {/* Left-aligned branding */}
          <div className="absolute bottom-4 left-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center shadow-lg overflow-hidden relative">
              {restaurant.logo ? (
                <Image
                  src={restaurant.logo}
                  alt="logo"
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : (
                <span className="text-lg font-bold text-foreground">
                  {restaurant.name.charAt(0)}
                </span>
              )}
            </div>
            {/* Client component for reactive language-aware text */}
            <MenuHeroBranding />
          </div>
        </div>

        {/* Client island: sticky tabs + scroll spy */}
        <MenuInteractions />

        {/* Product list */}
        <ProductList tableId={tableId} />

        {/* Footer */}
        <div className="text-center pt-16 pb-10">
          <span className="text-xs text-muted-foreground">© 2026 Powered by Prestige Yazilim</span>
        </div>
      </div>
    </LanguageProvider>
  );
}
