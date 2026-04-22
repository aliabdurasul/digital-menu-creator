"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/menu/LanguageProvider";

/**
 * Full-screen intro overlay for the restaurant module.
 * Auto-dismisses 2.2 s after mount with a fade-out transition.
 * Fades restaurant.name + a gold divider line + restaurant.description (if present).
 */
export function RestaurantIntro() {
  const { restaurant } = useLanguage();
  const [dismissed, setDismissed] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setDismissed(true), 3000);
    const t2 = setTimeout(() => setHidden(true), 4200); // remove from DOM after fade
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (hidden) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "#000000",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
        opacity: dismissed ? 0 : 1,
        visibility: dismissed ? "hidden" : "visible",
        pointerEvents: dismissed ? "none" : "auto",
        transition: "opacity 1.2s ease, visibility 1.2s",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div className="r-intro-logo">{restaurant.name}</div>
        <div className="r-intro-line" />
        {restaurant.description && (
          <div className="r-intro-subtitle">{restaurant.description}</div>
        )}
      </div>
    </div>
  );
}
