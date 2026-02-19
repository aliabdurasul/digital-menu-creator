import { useParams } from "react-router-dom";
import { useState, useRef, useCallback, useEffect } from "react";
import { mockRestaurants } from "@/lib/mockData";
import { CategoryTabs } from "@/components/menu/CategoryTabs";
import { ProductCard } from "@/components/menu/ProductCard";
import { UtensilsCrossed } from "lucide-react";

export default function MenuPage() {
  const { slug } = useParams<{ slug: string }>();
  const restaurant = mockRestaurants.find((r) => r.slug === slug);
  const [activeCat, setActiveCat] = useState("");
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (restaurant && restaurant.categories.length > 0 && !activeCat) {
      setActiveCat(restaurant.categories[0].id);
    }
  }, [restaurant, activeCat]);

  const handleCatSelect = useCallback((catId: string) => {
    setActiveCat(catId);
    const el = sectionRefs.current[catId];
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    if (!restaurant) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveCat(entry.target.getAttribute("data-cat-id") || "");
          }
        }
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: 0.1 }
    );
    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [restaurant]);

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-muted-foreground">
        <UtensilsCrossed className="w-12 h-12 mb-4" />
        <p className="text-lg font-semibold">Restaurant not found</p>
      </div>
    );
  }

  const sortedCategories = [...restaurant.categories].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-background">
      {/* Cover */}
      <div className="relative w-full h-48 sm:h-64 overflow-hidden">
        <img
          src={restaurant.coverImage}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
      </div>

      {/* Header */}
      <div className="relative -mt-10 px-4">
        <div className="flex items-end gap-4">
          <div className="w-20 h-20 rounded-2xl bg-card border-4 border-background flex items-center justify-center shadow-lg overflow-hidden">
            {restaurant.logo ? (
              <img src={restaurant.logo} alt="logo" className="w-full h-full object-cover" />
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

      {/* Category Tabs */}
      <div className="sticky top-0 z-20 mt-4 border-b border-border bg-background">
        <CategoryTabs
          categories={sortedCategories}
          activeId={activeCat}
          onSelect={handleCatSelect}
        />
      </div>

      {/* Products */}
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-8">
        {sortedCategories.map((cat) => {
          const products = restaurant.products
            .filter((p) => p.categoryId === cat.id)
            .sort((a, b) => a.order - b.order);
          if (products.length === 0) return null;
          return (
            <div
              key={cat.id}
              ref={(el) => { sectionRefs.current[cat.id] = el; }}
              data-cat-id={cat.id}
            >
              <h2 className="text-lg font-bold text-foreground mb-3">{cat.name}</h2>
              <div className="space-y-3">
                {products.map((p, i) => (
                  <div key={p.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-xs text-muted-foreground">
        Powered by <span className="font-semibold text-primary">Digital Menu</span>
      </div>
    </div>
  );
}
