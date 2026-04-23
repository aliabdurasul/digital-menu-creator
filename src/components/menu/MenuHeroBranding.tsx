"use client";

import { useLanguage } from "./LanguageProvider";

/**
 * Client component for the hero branding text (name + description).
 * Reads from LanguageProvider so text updates reactively on toggle.
 * Kept minimal — only the text that needs language switching.
 */
export function MenuHeroBranding() {
  const { restaurant } = useLanguage();

  return (
    <div>
      <h1
        className="font-serif font-medium text-primary-foreground drop-shadow-md"
        style={{ fontSize: "28px", letterSpacing: "1px", lineHeight: 1.15 }}
      >
        {restaurant.name}
      </h1>
      {restaurant.description && (
        <p
          className="text-primary-foreground/70 mt-1"
          style={{ fontSize: "12px", lineHeight: 1.4 }}
        >
          {restaurant.description}
        </p>
      )}
    </div>
  );
}
