import type { Category } from "@/types";
import { useRef, useEffect } from "react";
import { CategoryChip } from "@/components/ui/CategoryChip";

interface CategoryTabsProps {
  categories: Category[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function CategoryTabs({ categories, activeId, onSelect }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

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
      className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3 bg-background/80 backdrop-blur-md"
    >
      {categories
        .sort((a, b) => a.order - b.order)
        .map((cat) => {
          const isActive = cat.id === activeId;
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
        })}
    </div>
  );
}
