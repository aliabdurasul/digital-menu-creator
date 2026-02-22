/**
 * Tests for feature flag evaluation engine — pure function, no DB dependencies.
 *
 * Run with: npx vitest run src/test/feature-engine.test.ts
 */

import { describe, it, expect } from "vitest";
import { evaluateFeature, evaluateAllFeatures } from "@/lib/features/engine";
import { FEATURES, FEATURE_KEYS, type FeatureKey } from "@/lib/features/flags";

describe("evaluateFeature", () => {
  // ── Pro-only features on pro plan ─────────────────────────

  describe("pro-plan features enabled on pro", () => {
    const proOnlyFeatures: FeatureKey[] = ["custom_domain", "multi_language", "analytics", "custom_branding"];

    proOnlyFeatures.forEach((key) => {
      it(`should enable "${key}" for pro plan`, () => {
        expect(evaluateFeature(key, { plan: "pro" })).toBe(true);
      });
    });
  });

  // ── Pro-only features disabled on basic plan ──────────────

  describe("pro-plan features disabled on basic", () => {
    const proOnlyFeatures: FeatureKey[] = ["custom_domain", "multi_language", "analytics", "custom_branding"];

    proOnlyFeatures.forEach((key) => {
      it(`should disable "${key}" for basic plan`, () => {
        expect(evaluateFeature(key, { plan: "basic" })).toBe(false);
      });
    });
  });

  // ── Per-tenant overrides ──────────────────────────────────

  describe("per-tenant overrides", () => {
    it("should allow override to enable a feature on basic plan", () => {
      const result = evaluateFeature("custom_domain", {
        plan: "basic",
        overrides: { custom_domain: true },
      });
      expect(result).toBe(true);
    });

    it("should allow override to disable a feature on pro plan", () => {
      const result = evaluateFeature("analytics", {
        plan: "pro",
        overrides: { analytics: false },
      });
      expect(result).toBe(false);
    });

    it("should only override the specified feature", () => {
      const result = evaluateFeature("multi_language", {
        plan: "basic",
        overrides: { custom_domain: true }, // Different feature overridden
      });
      expect(result).toBe(false); // multi_language is still basic-disabled
    });
  });

  // ── Unknown feature keys ──────────────────────────────────

  describe("unknown feature keys", () => {
    it("should return false for unknown feature key", () => {
      // @ts-expect-error — testing runtime behavior with invalid key
      const result = evaluateFeature("nonexistent_feature", { plan: "pro" });
      expect(result).toBe(false);
    });
  });
});

describe("evaluateAllFeatures", () => {
  it("should return a record with all feature keys for pro plan", () => {
    const result = evaluateAllFeatures({ plan: "pro" });
    expect(Object.keys(result).sort()).toEqual([...FEATURE_KEYS].sort());

    // All current features are pro-only, so all should be true
    for (const key of FEATURE_KEYS) {
      expect(result[key]).toBe(true);
    }
  });

  it("should return a record with all feature keys for basic plan", () => {
    const result = evaluateAllFeatures({ plan: "basic" });
    expect(Object.keys(result).sort()).toEqual([...FEATURE_KEYS].sort());

    // All current features are pro-only, so all should be false
    for (const key of FEATURE_KEYS) {
      expect(result[key]).toBe(false);
    }
  });

  it("should respect overrides in evaluateAllFeatures", () => {
    const result = evaluateAllFeatures({
      plan: "basic",
      overrides: { custom_domain: true, analytics: true },
    });
    expect(result.custom_domain).toBe(true);
    expect(result.analytics).toBe(true);
    expect(result.multi_language).toBe(false);
    expect(result.custom_branding).toBe(false);
  });
});

describe("FEATURES definition integrity", () => {
  it("every feature should have a description", () => {
    for (const key of FEATURE_KEYS) {
      expect(FEATURES[key].description).toBeTruthy();
    }
  });

  it("every feature should have at least one plan", () => {
    for (const key of FEATURE_KEYS) {
      expect(FEATURES[key].plans.length).toBeGreaterThan(0);
    }
  });

  it("every feature should have a valid defaultEnabled value", () => {
    for (const key of FEATURE_KEYS) {
      expect(typeof FEATURES[key].defaultEnabled).toBe("boolean");
    }
  });
});
