"use client";

import { useState, useCallback, useEffect } from "react";
import type { Restaurant } from "@/types";
import { CategoryTabs } from "@/components/menu/CategoryTabs";
import { ProductList } from "@/components/menu/ProductList";

interface MenuContentProps {
  restaurant: Restaurant;
}

export function MenuContent({ restaurant }: MenuContentProps) {
  const [activeCat, setActiveCat] = useState("");

  const sortedCategories = [...restaurant.categories].sort(
    (a, b) => a.order - b.order
  );

  useEffect(() => {
    if (sortedCategories.length > 0 && !activeCat) {
      setActiveCat(sortedCategories[0].id);
    }
  }, [sortedCategories, activeCat]);

  const handleCatSelect = useCallback((catId: string) => {
    setActiveCat(catId);
    const el = document.querySelector<HTMLElement>(`[data-cat-id="${catId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("[data-cat-id]");
    if (!sections.length) return;

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
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [restaurant]);

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-background shadow-sm">
      {/* Cover */}
      <div className="relative w-full h-44 sm:h-56 overflow-hidden">
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
              <img
                src={restaurant.logo}
                alt="logo"
                className="w-full h-full object-cover"
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

      {/* Category Tabs */}
      <div className="sticky top-0 z-20 mt-4 border-b border-border bg-background">
        <CategoryTabs
          categories={sortedCategories}
          activeId={activeCat}
          onSelect={handleCatSelect}
        />
      </div>

      {/* Products */}
      <ProductList />

      {/* Footer */}
      <div className="text-center py-8 text-xs text-muted-foreground">
        <span className="font-semibold text-primary">© 2026 Lezzet-i Âlâ</span>
      </div>
    </div>
  );
}
