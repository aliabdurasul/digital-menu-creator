/**
 * Tests for domain resolver — pure function, no DB/network dependencies.
 *
 * Run with: npx vitest run src/test/domain-resolver.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to mock process.env before importing the module
describe("resolveDomain", () => {
  let resolveDomain: (hostname: string) => import("@/lib/tenant/types").DomainResolution;

  beforeEach(async () => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function loadResolver(appUrl: string) {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", appUrl);
    const mod = await import("@/lib/tenant/domain-resolver");
    resolveDomain = mod.resolveDomain;
  }

  // ── Platform domain (main site) ────────────────────────────

  describe("platform domain detection", () => {
    it("should detect exact primary domain as platform", async () => {
      await loadResolver("https://lezzet.app");
      const result = resolveDomain("lezzet.app");
      expect(result).toEqual({ type: "platform", slug: null });
    });

    it("should detect www.primary as platform", async () => {
      await loadResolver("https://lezzet.app");
      const result = resolveDomain("www.lezzet.app");
      expect(result).toEqual({ type: "platform", slug: null });
    });

    it("should strip port from hostname", async () => {
      await loadResolver("https://lezzet.app");
      const result = resolveDomain("lezzet.app:443");
      expect(result).toEqual({ type: "platform", slug: null });
    });

    it("should handle uppercase hostnames", async () => {
      await loadResolver("https://lezzet.app");
      const result = resolveDomain("Lezzet.App");
      expect(result).toEqual({ type: "platform", slug: null });
    });
  });

  // ── Subdomain routing ──────────────────────────────────────

  describe("subdomain detection", () => {
    it("should detect a subdomain as tenant", async () => {
      await loadResolver("https://lezzet.app");
      const result = resolveDomain("kebab.lezzet.app");
      expect(result).toEqual({ type: "subdomain", slug: "kebab" });
    });

    it("should handle hyphenated slugs", async () => {
      await loadResolver("https://lezzet.app");
      const result = resolveDomain("kebab-house.lezzet.app");
      expect(result).toEqual({ type: "subdomain", slug: "kebab-house" });
    });

    it("should detect subdomain with port", async () => {
      await loadResolver("https://lezzet.app");
      const result = resolveDomain("kebab.lezzet.app:3000");
      expect(result).toEqual({ type: "subdomain", slug: "kebab" });
    });

    it("should reject reserved subdomain 'www'", async () => {
      await loadResolver("https://lezzet.app");
      const result = resolveDomain("www.lezzet.app");
      expect(result).toEqual({ type: "platform", slug: null });
    });

    it("should reject reserved subdomain 'api'", async () => {
      await loadResolver("https://lezzet.app");
      const result = resolveDomain("api.lezzet.app");
      expect(result).toEqual({ type: "platform", slug: null });
    });

    it("should reject reserved subdomain 'admin'", async () => {
      await loadResolver("https://lezzet.app");
      const result = resolveDomain("admin.lezzet.app");
      expect(result).toEqual({ type: "platform", slug: null });
    });

    it("should reject multi-level subdomains", async () => {
      await loadResolver("https://lezzet.app");
      const result = resolveDomain("a.b.lezzet.app");
      expect(result).toEqual({ type: "platform", slug: null });
    });
  });

  // ── Localhost development ──────────────────────────────────

  describe("localhost development", () => {
    it("should detect localhost as platform", async () => {
      await loadResolver("http://localhost:3000");
      const result = resolveDomain("localhost:3000");
      expect(result).toEqual({ type: "platform", slug: null });
    });

    it("should detect localhost without port as platform", async () => {
      await loadResolver("http://localhost:3000");
      const result = resolveDomain("localhost");
      expect(result).toEqual({ type: "platform", slug: null });
    });

    it("should detect kebab.localhost as subdomain", async () => {
      await loadResolver("http://localhost:3000");
      const result = resolveDomain("kebab.localhost");
      expect(result).toEqual({ type: "subdomain", slug: "kebab" });
    });

    it("should detect kebab.localhost with port as subdomain", async () => {
      await loadResolver("http://localhost:3000");
      const result = resolveDomain("kebab.localhost:3000");
      expect(result).toEqual({ type: "subdomain", slug: "kebab" });
    });

    it("should reject reserved subdomains on localhost", async () => {
      await loadResolver("http://localhost:3000");
      const result = resolveDomain("www.localhost");
      expect(result).toEqual({ type: "platform", slug: null });
    });
  });

  // ── Custom domains ────────────────────────────────────────

  describe("custom domain detection", () => {
    it("should detect unknown domain as custom_domain", async () => {
      await loadResolver("https://lezzet.app");
      const result = resolveDomain("menu.kebabhouse.com");
      expect(result).toEqual({ type: "custom_domain", domain: "menu.kebabhouse.com" });
    });

    it("should detect bare custom domain", async () => {
      await loadResolver("https://lezzet.app");
      const result = resolveDomain("kebabmenu.com");
      expect(result).toEqual({ type: "custom_domain", domain: "kebabmenu.com" });
    });

    it("should strip port from custom domain", async () => {
      await loadResolver("https://lezzet.app");
      const result = resolveDomain("menu.kebabhouse.com:8080");
      expect(result).toEqual({ type: "custom_domain", domain: "menu.kebabhouse.com" });
    });

    it("should lowercase custom domain", async () => {
      await loadResolver("https://lezzet.app");
      const result = resolveDomain("Menu.KebabHouse.COM");
      expect(result).toEqual({ type: "custom_domain", domain: "menu.kebabhouse.com" });
    });
  });

  // ── Vercel preview deploys ────────────────────────────────

  describe("Vercel preview deploys", () => {
    it("should detect *.vercel.app as platform", async () => {
      await loadResolver("https://lezzet.app");
      const result = resolveDomain("my-project-abc123.vercel.app");
      expect(result).toEqual({ type: "platform", slug: null });
    });
  });

  // ── Edge cases ────────────────────────────────────────────

  describe("edge cases", () => {
    it("should handle missing NEXT_PUBLIC_APP_URL", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
      const mod = await import("@/lib/tenant/domain-resolver");
      const result = mod.resolveDomain("localhost:3000");
      expect(result).toEqual({ type: "platform", slug: null });
    });

    it("should handle primary domain derived from www URL", async () => {
      await loadResolver("https://www.lezzet.app");
      // "www" is stripped from primary, so lezzet.app is primary
      const result = resolveDomain("kebab.lezzet.app");
      expect(result).toEqual({ type: "subdomain", slug: "kebab" });
    });
  });
});
