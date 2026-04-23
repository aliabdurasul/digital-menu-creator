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
 *   "cafe"       → original light/orange layout
 */
export function MenuShell({ restaurant, restaurantEn = null, tableId }: MenuShellProps) {
  const isRestaurant = restaurant.moduleType === "restaurant";
  const arModelUrls = restaurant.products
    .filter((p) => p.arModelUrl)
    .map((p) => p.arModelUrl);

  return (
    <LanguageProvider restaurantTr={restaurant} restaurantEn={restaurantEn}>
      <ARWarmup arModelUrls={arModelUrls} />

      {isRestaurant ? (
        /* ── Restaurant: premium dark shell ── */
        <div className="restaurant-theme max-w-[480px] mx-auto min-h-screen shadow-sm">
          <RestaurantIntro />

          {/* Sticky topbar */}
          <div className="sticky top-0 z-[100] py-[18px] px-4 flex justify-center items-center backdrop-blur-md bg-background/90 border-b border-border">
            <span
              style={{ fontFamily: "'Outfit', sans-serif" }}
              className="font-semibold tracking-widest uppercase text-lg text-foreground"
            >
              {restaurant.name}
            </span>
          </div>

          {/* Hero: Ken Burns + gradient overlay */}
          <div className="relative h-[350px] overflow-hidden" style={{ background: "#0d0b09" }}>
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
              <div className="w-full h-full" style={{ background: "#14120e" }} />
            )}
            <div
              className="absolute inset-x-0 bottom-0 h-[70%] z-[1]"
              style={{ background: "linear-gradient(to top, hsl(30 18% 8%) 10%, transparent 100%)" }}
            />
            <div className="absolute top-3 right-4 z-10">
              <LanguageToggle />
            </div>
            {restaurant.description && (
              <div className="absolute bottom-8 inset-x-0 px-6 z-10 text-center">
                <p
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  className="text-2xl font-medium italic text-foreground drop-shadow-lg"
                >
                  {restaurant.description}
                </p>
              </div>
            )}
          </div>

          <MenuInteractions />
          <ProductList tableId={tableId} />

          <div className="text-center pt-16 pb-10">
            <span className="text-[10px] text-foreground/10">Powered by Prestige Yazilim</span>
          </div>
        </div>
      ) : (
        /* ── Cafe: original light/orange shell ── */
        <div className="max-w-[480px] mx-auto min-h-screen bg-background text-foreground shadow-sm">
          {/* Cover image */}
          <div className="relative h-44 overflow-hidden bg-muted">
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
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            <div className="absolute top-3 left-4 z-10">
              <CoffeeClubButton />
            </div>
            <div className="absolute top-3 right-4 z-10">
              <LanguageToggle />
            </div>
          </div>

          {/* Branding header: logo + name */}
          <div className="relative -mt-8 px-4 pb-2 z-10">
            <div className="flex items-end gap-3">
              <div className="w-16 h-16 rounded-2xl bg-card border-4 border-background shadow-lg overflow-hidden relative shrink-0">
                {restaurant.logo ? (
                  <Image
                    src={restaurant.logo}
                    alt="logo"
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-2xl font-extrabold text-primary">
                    {restaurant.name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="pb-2">
                <h1 className="text-xl font-extrabold text-foreground leading-tight">{restaurant.name}</h1>
                {restaurant.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{restaurant.description}</p>
                )}
              </div>
            </div>
          </div>

          <MenuInteractions />
          <ProductList tableId={tableId} />

          <div className="text-center pt-16 pb-10">
            <span className="text-xs text-muted-foreground/60">Powered by Prestige Yazılım</span>
          </div>
        </div>
      )}
    </LanguageProvider>
  );
}
