"use client";

import { useEffect, useRef, useState } from "react";
import type { Category } from "@/types";
import { cn } from "@/lib/utils";

interface MenuInteractionsProps {
  categories: Category[];
}

/**
 * Thin client island (~2 KB JS).
 * Responsibilities:
 *   1. Sticky category tabs
 *   2. Scroll-spy with IntersectionObserver on [data-cat-id] sections
 *   3. Smooth scroll-to on tab click
 */
export function MenuInteractions({ categories }: MenuInteractionsProps) {
  const [activeCat, setActiveCat] = useState(categories[0]?.id ?? "");
  const tabsRef = useRef<HTMLDivElement>(null);
  const isClickingRef = useRef(false);

  /* ── 1. Scroll-spy via IntersectionObserver ── */
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("[data-cat-id]");
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickingRef.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-cat-id");
            if (id) setActiveCat(id);
          }
        }
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  /* ── 2. Auto-scroll active tab button into view ── */
  useEffect(() => {
    if (!tabsRef.current) return;
    const btn = tabsRef.current.querySelector<HTMLButtonElement>(
      `[data-tab="${activeCat}"]`
    );
    btn?.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
  }, [activeCat]);

  /* ── 3. Tab click → smooth scroll to section ── */
  function handleTabClick(catId: string) {
    setActiveCat(catId);
    isClickingRef.current = true;

    const section = document.querySelector<HTMLElement>(
      `[data-cat-id="${catId}"]`
    );
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      // Re-enable scroll spy after the scroll finishes
      setTimeout(() => {
        isClickingRef.current = false;
      }, 800);
    } else {
      isClickingRef.current = false;
    }
  }

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
      <div className="flex items-center gap-1 px-3 py-2.5">
        <div
          ref={tabsRef}
          className="flex gap-2 overflow-x-auto flex-1 scrollbar-hide"
        >
          {categories.map((cat) => (
            <button
              key={cat.id}
              data-tab={cat.id}
              onClick={() => handleTabClick(cat.id)}
              className={cn(
                "min-h-[40px] whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-200",
                activeCat === cat.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
