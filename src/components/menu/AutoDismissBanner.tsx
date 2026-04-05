"use client";

import { useState, useEffect } from "react";

interface AutoDismissBannerProps {
  children: React.ReactNode;
  /** Auto-dismiss delay in ms (default 3000) */
  duration?: number;
}

/**
 * Shows children briefly, then fades out and unmounts.
 * Used for the cafe self-servis indicator so it doesn't stay sticky.
 */
export function AutoDismissBanner({ children, duration = 3000 }: AutoDismissBannerProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), duration);
    const removeTimer = setTimeout(() => setVisible(false), duration + 500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [duration]);

  if (!visible) return null;

  return (
    <div
      className={`max-w-[480px] mx-auto px-4 pt-3 transition-all duration-500 ${
        fading ? "opacity-0 -translate-y-2" : "opacity-100 translate-y-0"
      }`}
    >
      {children}
    </div>
  );
}
