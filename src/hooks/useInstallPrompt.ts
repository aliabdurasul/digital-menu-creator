"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export type InstallOutcome = "accepted" | "dismissed" | "unavailable";

interface UseInstallPromptOptions {
  /** Called when the PWA is successfully installed (via any method). */
  onInstalled?: () => void;
}

/**
 * Captures the browser `beforeinstallprompt` event so we can defer and
 * show our own custom install CTA instead of the browser's default prompt.
 *
 * Usage:
 *   const { canInstall, isInstalled, triggerInstall } = useInstallPrompt();
 *
 * `canInstall` — true when the browser has fired beforeinstallprompt AND
 *               the app is not already installed (standalone mode).
 * `isInstalled` — true when running in standalone / already installed.
 * `triggerInstall()` — shows the deferred browser install prompt.
 *                      Returns "accepted" | "dismissed" | "unavailable".
 */
export function useInstallPrompt(options?: UseInstallPromptOptions) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const onInstalledRef = useRef(options?.onInstalled);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already in standalone (installed PWA)
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault(); // Prevent browser's mini-infobar
      setPromptEvent(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setPromptEvent(null);
      onInstalledRef.current?.();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const triggerInstall = useCallback(async (): Promise<InstallOutcome> => {
    if (!promptEvent) return "unavailable";
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    setPromptEvent(null);
    return outcome;
  }, [promptEvent]);

  return {
    /** True when the browser supports installation and app is not yet installed */
    canInstall: !!promptEvent && !isInstalled,
    /** True when running as installed PWA (standalone) */
    isInstalled,
    /** Show the deferred browser install dialog */
    triggerInstall,
  };
}
