"use client";

import { useState, useEffect } from "react";
import { InstallPromptSheet } from "@/components/loyalty/InstallPromptSheet";

const SNOOZE_KEY = "install_prompt_snoozed";
const SNOOZE_HOURS = 48;
const AUTO_SHOW_DELAY_MS = 10_000;

function isSnoozed(): boolean {
  if (typeof window === "undefined") return true;
  const ts = localStorage.getItem(SNOOZE_KEY);
  if (!ts) return false;
  return Date.now() < new Date(ts).getTime() + SNOOZE_HOURS * 60 * 60 * 1000;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

/**
 * Auto-shows the InstallPromptSheet after 10s on public menu pages.
 * Respects 48h snooze and standalone mode detection.
 */
export function PublicInstallTrigger() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isStandalone() || isSnoozed()) return;

    const timer = setTimeout(() => {
      // Re-check in case conditions changed during delay
      if (!isStandalone() && !isSnoozed()) {
        setOpen(true);
      }
    }, AUTO_SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  return (
    <InstallPromptSheet
      open={open}
      onClose={() => setOpen(false)}
    />
  );
}
