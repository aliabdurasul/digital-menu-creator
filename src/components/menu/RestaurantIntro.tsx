"use client";

import { useEffect, useReducer, useCallback } from "react";
import { useLanguage } from "@/components/menu/LanguageProvider";

type IntroState = "idle" | "playing" | "fading" | "done";

type IntroAction =
  | { type: "play" }
  | { type: "fade" }
  | { type: "done" };

function reducer(_: IntroState, action: IntroAction): IntroState {
  switch (action.type) {
    case "play": return "playing";
    case "fade": return "fading";
    case "done": return "done";
    default: return "idle";
  }
}

/**
 * Full-screen intro overlay for the restaurant module.
 *
 * Behaviour:
 * - Shows only once per browser session (sessionStorage-keyed by restaurant.id).
 * - Respects prefers-reduced-motion: skipped entirely.
 * - Auto-dismisses after 3 s; user can skip early.
 * - Transitions: logo fades up, line expands from center, subtitle fades in.
 */
export function RestaurantIntro() {
  const { restaurant } = useLanguage();
  const [state, dispatch] = useReducer(reducer, "idle");

  useEffect(() => {
    // Accessibility: skip intro for users who prefer reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Session guard: show only once per browser session per restaurant
    const key = `intro:${restaurant.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    dispatch({ type: "play" });

    const t1 = setTimeout(() => dispatch({ type: "fade" }), 3000);
    const t2 = setTimeout(() => dispatch({ type: "done" }), 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant.id]);

  const skip = useCallback(() => {
    dispatch({ type: "fade" });
    setTimeout(() => dispatch({ type: "done" }), 1200);
  }, []);

  if (state === "idle" || state === "done") return null;

  return (
    <div
      aria-hidden="true"
      className="intro-overlay"
      data-fading={state === "fading" ? "true" : undefined}
    >
      <button
        type="button"
        className="intro-skip"
        onClick={skip}
        aria-label="Introyu geç"
      >
        Geç
      </button>
      <div className="intro-content">
        <div className="intro-logo">{restaurant.name}</div>
        <div className="intro-line" />
        {restaurant.description && (
          <div className="intro-subtitle">{restaurant.description}</div>
        )}
      </div>
    </div>
  );
}
