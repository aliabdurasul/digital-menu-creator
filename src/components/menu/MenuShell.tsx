import Image from "next/image";
import type { Restaurant } from "@/types";
import { ProductList } from "@/components/menu/ProductList";
import { MenuInteractions } from "@/components/menu/MenuInteractions";

interface MenuShellProps {
  restaurant: Restaurant;
}

/**
 * Server Component — renders the entire menu as static HTML.
 * Only <MenuInteractions> and <ProductList> ship JS (sticky tabs + bottom sheet).
 */
export function MenuShell({ restaurant }: MenuShellProps) {
  const sortedCategories = [...restaurant.categories].sort(
    (a, b) => a.order - b.order
  );

  return (
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
          <div>
            <h1 className="text-xl font-bold text-primary-foreground drop-shadow-md">
              {restaurant.name}
            </h1>
            {restaurant.description && (
              <p className="text-primary-foreground/80 text-xs mt-0.5">
                {restaurant.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Client island: sticky tabs + scroll spy */}
      <MenuInteractions categories={sortedCategories} />

      {/* Product list */}
      <ProductList
        products={restaurant.products}
        categories={sortedCategories}
      />

      {/* Footer */}
      <div className="text-center pt-16 pb-10">
        <span className="text-xs text-muted-foreground">© 2026 Lezzet-i Âlâ</span>
      </div>
    </div>
  );
}
