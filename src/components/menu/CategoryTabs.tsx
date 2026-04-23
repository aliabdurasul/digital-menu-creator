import type { Category } from "@/types";
import { useRef, useEffect } from "react";
import { CategoryChip } from "@/components/ui/CategoryChip";
import { useLanguage } from "@/components/menu/LanguageProvider";
import { cn } from "@/lib/utils";

interface CategoryTabsProps {
  categories: Category[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function CategoryTabs({ categories, activeId, onSelect }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const { restaurant } = useLanguage();
  const isRestaurant = restaurant.moduleType === "restaurant";

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = activeRef.current;
      const left = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
      container.scrollTo({ left, behavior: "smooth" });
    }
  }, [activeId]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        "flex overflow-x-auto scrollbar-hide px-4 bg-background/80 backdrop-blur-md",
        isRestaurant ? "gap-2 py-3" : "py-2 border-b border-border shadow-sm gap-6"
      )}
    >
      {categories
        .sort((a, b) => a.order - b.order)
        .map((cat) => {
          const isActive = cat.id === activeId;
          
          if (isRestaurant) {
            return (
              <CategoryChip
                key={cat.id}
                ref={isActive ? activeRef : undefined}
                onClick={() => onSelect(cat.id)}
                isActive={isActive}
              >
                {cat.name}
              </CategoryChip>
            );
          }

          // Cafe standard tabs
          return (
            <button
              key={cat.id}
              ref={isActive ? activeRef : undefined}
              onClick={() => onSelect(cat.id)}
              className={cn(
                "whitespace-nowrap px-1 py-2 text-sm font-medium transition-colors relative",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {cat.name}
              {isActive && (
                <div className="absolute left-0 right-0 bottom-[-8px] h-[2px] bg-primary rounded-t-full" />
              )}
            </button>
          );
        })}
    </div>
  );
}
