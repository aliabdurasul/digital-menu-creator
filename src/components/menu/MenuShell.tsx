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
    <div className="max-w-md mx-auto min-h-screen bg-white">
      {/* ── Hero cover — 220px with rounded bottom ── */}
      <div className="relative w-full h-[220px] overflow-hidden rounded-b-[2rem]">
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
          <div className="w-full h-full bg-neutral-200" />
        )}
        <div className="absolute inset-0 bg-black/30" />

        {/* Centered branding on cover */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-[72px] h-[72px] rounded-2xl bg-white/95 backdrop-blur flex items-center justify-center shadow-xl overflow-hidden relative">
            {restaurant.logo ? (
              <Image
                src={restaurant.logo}
                alt="logo"
                fill
                sizes="72px"
                className="object-cover"
              />
            ) : (
              <span className="text-2xl font-extrabold text-neutral-900">
                {restaurant.name.charAt(0)}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white text-center drop-shadow-lg px-4">
            {restaurant.name}
          </h1>
          {restaurant.description && (
            <p className="text-white/80 text-xs text-center max-w-[280px] leading-relaxed">
              {restaurant.description}
            </p>
          )}
        </div>
      </div>

      {/* Client island: sticky tabs + scroll spy */}
      <MenuInteractions categories={sortedCategories} />

      {/* Product grid with bottom sheet */}
      <ProductList
        products={restaurant.products}
        categories={sortedCategories}
      />

      {/* Footer */}
      <div className="text-center pt-16 pb-10">
        <span className="text-xs text-neutral-300 font-medium">© 2026 Lezzet-i Âlâ</span>
      </div>
    </div>
  );
}
