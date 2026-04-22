"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useLanguage } from "@/components/menu/LanguageProvider";


/**
 * Thin client island.
 * Responsibilities:
 *   1. Sticky category tabs (read from LanguageProvider context)
 *   2. Scroll-spy with IntersectionObserver on [data-cat-id] sections
 *   3. Smooth scroll-to on tab click
 */

export function MenuInteractions() {
  const { restaurant } = useLanguage();
  const categories = useMemo(
    () => [...restaurant.categories].sort((a, b) => a.order - b.order),
    [restaurant.categories]
  );

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
    <div
      className="sticky top-0 z-30 backdrop-blur"
      style={{
        background: "rgba(10,8,6,0.88)",
        borderBottom: "1px solid rgba(196,154,60,0.15)",
      }}
    >
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
              className="min-h-[36px] whitespace-nowrap px-4 py-1.5 rounded-full transition-all duration-200"
              style={{
                fontFamily: "var(--font-outfit, sans-serif)",
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "0.06em",
                ...(activeCat === cat.id
                  ? {
                      background: "rgba(196,154,60,0.14)",
                      border: "1px solid rgba(196,154,60,0.55)",
                      color: "#c49a3c",
                    }
                  : {
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(168,155,140,0.75)",
                    }),
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
