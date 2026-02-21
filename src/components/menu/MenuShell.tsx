import Image from "next/image";
import type { Restaurant } from "@/types";
import { ProductCard } from "@/components/menu/ProductCard";
import { MenuInteractions } from "@/components/menu/MenuInteractions";

interface MenuShellProps {
  restaurant: Restaurant;
}

/**
 * Server Component — renders the entire menu as static HTML.
 * Only the thin <MenuInteractions> island ships JS for:
 *   - sticky category tab highlighting
 *   - smooth-scroll on tab click
 *   - view count increment
 */
export function MenuShell({ restaurant }: MenuShellProps) {
  const sortedCategories = [...restaurant.categories].sort(
    (a, b) => a.order - b.order
  );

  const categorySections = sortedCategories
    .map((cat) => ({
      ...cat,
      products: restaurant.products
        .filter((p) => p.categoryId === cat.id)
        .sort((a, b) => a.order - b.order),
    }))
    .filter((cat) => cat.products.length > 0);

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

      {/* Client island: sticky tabs + scroll spy + view tracking */}
      <MenuInteractions
        categories={sortedCategories}
        slug={restaurant.slug}
      />

      {/* Products — fully server-rendered, zero JS */}
      <div className="px-3 py-4 space-y-8">
        {categorySections.map((cat) => (
          <div key={cat.id} data-cat-id={cat.id}>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {cat.name}
            </h2>
            <div className="space-y-3">
              {cat.products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-xs text-muted-foreground">
        Powered by{" "}
        <span className="font-semibold text-primary">Digital Menu</span>
      </div>
    </div>
  );
}
