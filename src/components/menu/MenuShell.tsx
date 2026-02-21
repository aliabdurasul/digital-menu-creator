import Image from "next/image";
import type { Restaurant } from "@/types";
import { ProductList } from "@/components/menu/ProductList";
import { MenuInteractions } from "@/components/menu/MenuInteractions";

interface MenuShellProps {
  restaurant: Restaurant;
}

/**
 * Server Component — renders the entire menu as static HTML.
 * Only the thin <MenuInteractions> island ships JS for:
 *   - sticky category tab highlighting
 *   - smooth-scroll on tab click
 */
export function MenuShell({ restaurant }: MenuShellProps) {
  const sortedCategories = [...restaurant.categories].sort(
    (a, b) => a.order - b.order
  );

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-background shadow-sm">
      {/* Cover — LCP image: priority + eager loading */}
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
      </div>

      {/* Header */}
      <div className="relative -mt-10 px-4">
        <div className="flex items-end gap-4">
          <div className="w-20 h-20 rounded-2xl bg-card border-4 border-background flex items-center justify-center shadow-lg overflow-hidden relative">
            {restaurant.logo ? (
              <Image
                src={restaurant.logo}
                alt="logo"
                fill
                sizes="80px"
                className="object-cover"
              />
            ) : (
              <span className="text-2xl font-extrabold text-primary">
                {restaurant.name.charAt(0)}
              </span>
            )}
          </div>
          <div className="pb-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground">
              {restaurant.name}
            </h1>
          </div>
        </div>
      </div>

      {/* Client island: sticky tabs + scroll spy */}
      <MenuInteractions
        categories={sortedCategories}
      />

      {/* Accordion product list */}
      <ProductList
        products={restaurant.products}
        categories={sortedCategories}
      />

      {/* Footer */}
      <div className="text-center pt-16 pb-10 text-xs text-muted-foreground/60">
        <span className="font-semibold text-primary">© 2026 Lezzet-i Âlâ</span>
      </div>
    </div>
  );
}
