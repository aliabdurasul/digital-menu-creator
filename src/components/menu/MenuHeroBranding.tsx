"use client";

import { useLanguage } from "./LanguageProvider";

/**
 * Centered hero branding — restaurant name in Cormorant italic + gold tagline.
 * Reads from LanguageProvider so text updates reactively on toggle.
 */
export function MenuHeroBranding() {
  const { restaurant } = useLanguage();

  return (
    <div style={{ textAlign: "center" }}>
      <h1
        style={{
          fontFamily: "var(--font-cormorant, 'Georgia', serif)",
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: "clamp(28px, 8vw, 42px)",
          color: "#f5f1e8",
          textShadow: "0 2px 24px rgba(0,0,0,0.65)",
          lineHeight: 1.1,
          margin: 0,
          letterSpacing: "0.01em",
        }}
      >
        {restaurant.name}
      </h1>
      {restaurant.description && (
        <p
          style={{
            fontFamily: "var(--font-outfit, sans-serif)",
            fontWeight: 300,
            fontSize: 11,
            letterSpacing: "0.24em",
            color: "rgba(196,154,60,0.8)",
            textTransform: "uppercase",
            marginTop: 8,
          }}
        >
          {restaurant.description}
        </p>
      )}
    </div>
  );
}
