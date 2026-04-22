import Image from "next/image";
import type { Restaurant } from "@/types";
import { ProductList } from "@/components/menu/ProductList";
import { MenuInteractions } from "@/components/menu/MenuInteractions";
import { LanguageProvider } from "@/components/menu/LanguageProvider";
import { MenuHeroBranding } from "@/components/menu/MenuHeroBranding";
import { LanguageToggle } from "@/components/menu/LanguageToggle";
import { CoffeeClubButton } from "@/components/loyalty/CoffeeClubButton";
import { ARWarmup } from "@/components/menu/ARWarmup";
import { MenuIntro } from "@/components/menu/MenuIntro";

interface MenuShellProps {
  restaurant: Restaurant;
  restaurantEn?: Restaurant | null;
  tableId?: string;
}

/**
 * Server Component — renders the entire menu as static HTML.
 * Only <MenuInteractions> and <ProductList> ship JS.
 * Luxury fine-dining theme applied via data-theme="luxury".
 */
export function MenuShell({ restaurant, restaurantEn = null, tableId }: MenuShellProps) {
  const arModelUrls = restaurant.products
    .filter((p) => p.arModelUrl)
    .map((p) => p.arModelUrl);

  return (
    <LanguageProvider restaurantTr={restaurant} restaurantEn={restaurantEn}>
      {/* Silently warm WebGL + preload above-fold AR models */}
      <ARWarmup arModelUrls={arModelUrls} />

      {/* Cinematic welcome splash — unmounts after 3 s */}
      <MenuIntro name={restaurant.name} tagline={restaurant.description} />

      <div
        data-theme="luxury"
        className="max-w-[480px] mx-auto min-h-screen bg-background"
        style={{ fontFamily: "var(--font-outfit, 'Plus Jakarta Sans', sans-serif)" }}
      >
        {/* ── Cinematic Hero ── */}
        <div className="relative w-full overflow-hidden" style={{ height: 300 }}>
          {restaurant.coverImage ? (
            <Image
              src={restaurant.coverImage}
              alt={restaurant.name}
              fill
              sizes="480px"
              priority
              className="object-cover"
              style={{ filter: "brightness(0.45)" }}
            />
          ) : (
            <div className="w-full h-full" style={{ background: "#13100b" }} />
          )}

          {/* Deep bottom-heavy gradient */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, #0a0806 0%, rgba(10,8,6,0.55) 55%, rgba(10,8,6,0.05) 100%)",
            }}
          />

          {/* Top controls */}
          <div className="absolute top-4 left-4 z-10">
            <CoffeeClubButton />
          </div>
          <div className="absolute top-4 right-4 z-10">
            <LanguageToggle />
          </div>

          {/* Centered bottom branding */}
          <div className="absolute bottom-0 inset-x-0 flex flex-col items-center pb-9 px-6">
            {restaurant.logo && (
              <div
                className="relative w-14 h-14 rounded-full overflow-hidden mb-3"
                style={{ border: "1.5px solid rgba(196,154,60,0.5)" }}
              >
                <Image
                  src={restaurant.logo}
                  alt="logo"
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
            )}
            {/* Client component for reactive language-aware name/tagline */}
            <MenuHeroBranding />
          </div>
        </div>

        {/* Sticky category tabs */}
        <MenuInteractions />

        {/* Product list */}
        <ProductList tableId={tableId} />

        {/* Decorative footer */}
        <div className="flex flex-col items-center gap-3 pt-10 pb-20">
          <div
            style={{
              width: 48,
              height: 1,
              background:
                "linear-gradient(90deg, transparent, rgba(196,154,60,0.35), transparent)",
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: "rgba(168,155,140,0.3)",
              letterSpacing: "0.18em",
            }}
          >
            ✦
          </span>
        </div>
      </div>
    </LanguageProvider>
  );
}

