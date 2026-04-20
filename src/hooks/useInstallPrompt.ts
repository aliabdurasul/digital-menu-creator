"use client";

import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export type InstallOutcome = "accepted" | "dismissed" | "unavailable";

interface InstallPromptContextValue {
  canInstall: boolean;
  isInstalled: boolean;
  triggerInstall: () => Promise<InstallOutcome>;
  /** Register a callback to fire once when the PWA is installed */
  onInstalled: (cb: () => void) => void;
}

const InstallPromptContext = createContext<InstallPromptContextValue | null>(null);

/**
 * Wrap this around the menu page tree (once) so all install-prompt
 * consumers share the same captured `beforeinstallprompt` event.
 */
export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const installedCallbacksRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setPromptEvent(null);
      installedCallbacksRef.current.forEach((cb) => cb());
      installedCallbacksRef.current = [];
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

  const registerOnInstalled = useCallback((cb: () => void) => {
    installedCallbacksRef.current.push(cb);
  }, []);

  return (
    <InstallPromptContext.Provider
      value={{
        canInstall: !!promptEvent && !isInstalled,
        isInstalled,
        triggerInstall,
        onInstalled: registerOnInstalled,
      }}
    >
      {children}
    </InstallPromptContext.Provider>
  );
}

/**
 * Consume the shared install-prompt state.
 * Falls back to a standalone hook when no provider is present (backwards compat).
 */
export function useInstallPrompt(options?: { onInstalled?: () => void }) {
  const ctx = useContext(InstallPromptContext);

  // Register onInstalled callback with provider
  const onInstalledRef = useRef(options?.onInstalled);
  onInstalledRef.current = options?.onInstalled;

  useEffect(() => {
    if (!ctx || !onInstalledRef.current) return;
    const cb = () => onInstalledRef.current?.();
    ctx.onInstalled(cb);
  }, [ctx]);

  if (ctx) return ctx;

  // Fallback: no provider (should not happen in practice)
  return { canInstall: false, isInstalled: false, triggerInstall: async () => "unavailable" as InstallOutcome };
}
