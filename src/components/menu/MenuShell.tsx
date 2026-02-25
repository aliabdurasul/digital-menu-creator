import Image from "next/image";
import type { Restaurant } from "@/types";
import { ProductList } from "@/components/menu/ProductList";
import { MenuInteractions } from "@/components/menu/MenuInteractions";
import { LanguageProvider } from "@/components/menu/LanguageProvider";
import { MenuHeroBranding } from "@/components/menu/MenuHeroBranding";
import { LanguageToggle } from "@/components/menu/LanguageToggle";

interface MenuShellProps {
  restaurant: Restaurant;
  restaurantEn?: Restaurant | null;
}

/**
 * Server Component — renders the entire menu as static HTML.
 * Only <MenuInteractions> and <ProductList> ship JS (sticky tabs + bottom sheet).
 * Wraps client islands in <LanguageProvider> for reactive language switching.
 */
export function MenuShell({ restaurant, restaurantEn = null }: MenuShellProps) {
  return (
    <LanguageProvider restaurantTr={restaurant} restaurantEn={restaurantEn}>
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
        <ProductList />

        {/* Footer */}
        <div className="text-center pt-16 pb-10">
          <span className="text-xs text-muted-foreground">© 2026 Lezzet-i Âlâ</span>
        </div>
      </div>
    </LanguageProvider>
  );
}
