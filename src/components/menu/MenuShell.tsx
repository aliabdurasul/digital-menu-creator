import Image from "next/image";
import type { Restaurant } from "@/types";
import { ProductList } from "@/components/menu/ProductList";
import { MenuInteractions } from "@/components/menu/MenuInteractions";
import { LanguageProvider } from "@/components/menu/LanguageProvider";
import { MenuHeroBranding } from "@/components/menu/MenuHeroBranding";
import { LanguageToggle } from "@/components/menu/LanguageToggle";
import { CoffeeClubButton } from "@/components/loyalty/CoffeeClubButton";
import { ARWarmup } from "@/components/menu/ARWarmup";

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

  if (isRestaurant) {
    return (
      <LanguageProvider restaurantTr={restaurant} restaurantEn={restaurantEn}>
        {/* Silently warm WebGL + preload above-fold AR models */}
        <ARWarmup arModelUrls={arModelUrls} />

        <div className="theme-restaurant dark max-w-[480px] mx-auto min-h-screen bg-background text-foreground shadow-sm">
          {/* Sticky topbar */}
          <div className="sticky top-0 z-[100] py-[18px] px-4 flex justify-center items-center backdrop-blur-md bg-background/90 border-b border-border">
            <span className="font-outfit font-semibold tracking-widest uppercase text-lg text-foreground">
              {restaurant.name}
            </span>
          </div>

          {/* Hero */}
          <div className="relative h-[350px] overflow-hidden bg-background">
            {restaurant.coverImage ? (
              <Image
                src={restaurant.coverImage}
                alt={restaurant.name}
                fill
                sizes="480px"
                priority
                className="object-cover r-hero-zoom"
              />
            ) : (
              <div className="w-full h-full bg-muted" />
            )}
            {/* Bottom gradient overlay */}
            <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-background via-background/60 to-transparent z-[1]" />

            {/* Top-left Coffee Club button */}
            <div className="absolute top-3 left-4 z-10">
              <CoffeeClubButton />
            </div>

            {/* Top-right language toggle */}
            <div className="absolute top-3 right-4 z-10">
              <LanguageToggle />
            </div>

            {/* Left-aligned branding merged from cafe */}
            <div className="absolute bottom-6 left-4 flex items-center gap-3 z-10">
              <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center shadow-lg overflow-hidden relative shrink-0">
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

          {/* Client island: sticky category tabs + scroll-spy */}
          <MenuInteractions />

          {/* Product list */}
          <ProductList tableId={tableId} />

          {/* Subtle footer */}
          <div className="text-center pt-16 pb-10">
            <span className="text-xs text-muted-foreground/60">
              Powered by Prestige Yazılım
            </span>
          </div>
        </div>
      </LanguageProvider>
    );
  }

  // Original Cafe Layout
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
                <span className="text-2xl font-bold text-foreground">
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
          <span className="text-xs text-muted-foreground">Powered by Prestige Yazılım</span>
        </div>
      </div>
    </LanguageProvider>
  );
}
