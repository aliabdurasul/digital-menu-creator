"use client";

import { canUseFeature, requiresPro } from "./engine";
import { FEATURE_MAP, type FeatureKey, type PlanType } from "./flags";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

/**
 * Hook to check feature access in client components.
 */
export function useFeatureGate(plan: PlanType, feature: FeatureKey) {
  const allowed = canUseFeature(plan, feature);
  const isPro = requiresPro(feature);
  const meta = FEATURE_MAP[feature];
  return { allowed, isPro, label: meta?.label ?? feature, description: meta?.description ?? "" };
}

/**
 * Small "PRO" badge shown next to pro-only features.
 */
export function ProBadge() {
  return (
    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary font-semibold">
      PRO
    </Badge>
  );
}

/**
 * Inline upgrade prompt shown when a basic-plan user tries to access a pro feature.
 */
export function UpgradePrompt({ feature }: { feature: FeatureKey }) {
  const meta = FEATURE_MAP[feature];
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center border rounded-lg bg-muted/30">
      <Lock className="w-8 h-8 text-muted-foreground" />
      <h3 className="font-semibold">{meta?.label ?? "Pro Özellik"}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {meta?.description ?? "Bu özellik Pro plana aittir."}
      </p>
      <p className="text-xs text-muted-foreground">
        Bu özelliği kullanmak için Pro plana yükseltin.
      </p>
    </div>
  );
}

/**
 * Wrapper component that conditionally renders children based on feature access.
 * Shows UpgradePrompt when access is denied.
 */
export function FeatureGate({
  plan,
  feature,
  children,
  fallback,
}: {
  plan: PlanType;
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const allowed = canUseFeature(plan, feature);
  if (allowed) return <>{children}</>;
  return <>{fallback ?? <UpgradePrompt feature={feature} />}</>;
}
