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
      <h1 className="text-xl font-bold text-primary-foreground drop-shadow-md">
        {restaurant.name}
      </h1>
      {restaurant.description && (
        <p className="text-primary-foreground/80 text-xs mt-0.5">
          {restaurant.description}
        </p>
      )}
    </div>
  );
}
