import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { resolveDomain } from "@/lib/tenant/domain-resolver";
import { TENANT_HEADERS } from "@/lib/tenant/types";

/**
 * Query profile role using the service-role key (bypasses RLS).
 * The profiles table has a self-referencing RLS policy that blocks
 * anon-key queries, so we must use the service key here.
 */
async function getProfileRole(userId: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;

  const admin = createSupabaseClient(url, serviceKey);
  const { data: profile, error } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error || !profile) return null;
  return profile.role;
}

/**
 * Check if domain-based routing is enabled.
 * Kill switch: set ENABLE_DOMAIN_ROUTING=false in Vercel env vars
 * to instantly revert to slug-only routing without a deploy.
 */
function isDomainRoutingEnabled(): boolean {
  return process.env.ENABLE_DOMAIN_ROUTING !== "false";
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not write any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Helper: create a redirect that preserves Supabase auth cookies.
  // Without this, token refreshes done inside getUser() are lost.
  function redirect(url: URL) {
    const res = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      res.cookies.set(cookie.name, cookie.value, cookie);
    });
    return res;
  }

  // Helper: create a rewrite that preserves Supabase auth cookies + sets headers.
  function rewrite(url: URL, headers?: Record<string, string>) {
    const reqHeaders = new Headers(request.headers);
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        reqHeaders.set(key, value);
      }
    }
    const res = NextResponse.rewrite(url, {
      request: { headers: reqHeaders },
    });
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      res.cookies.set(cookie.name, cookie.value, cookie);
    });
    return res;
  }

  const { pathname } = request.nextUrl;

  // ── Domain-based tenant routing ──────────────────────────────
  // Only runs when ENABLE_DOMAIN_ROUTING is not "false".
  // Pure function call (no DB) — just classifies the hostname.
  if (isDomainRoutingEnabled()) {
    const hostname = request.headers.get("host") || "localhost";
    const resolution = resolveDomain(hostname);

    if (resolution.type === "subdomain") {
      // Subdomain request (e.g., kebab.lezzet.app)
      // Rewrite to the tenant route group with tenant headers.
      // Only rewrite the root path — let other paths (like /api) pass through.
      if (pathname === "/" || pathname === "") {
        const tenantUrl = new URL("/_tenant", request.url);
        return rewrite(tenantUrl, {
          [TENANT_HEADERS.SLUG]: resolution.slug,
          [TENANT_HEADERS.RESOLVED_VIA]: "subdomain",
        });
      }
      // For non-root paths on subdomains, continue to existing routing
      // (e.g., kebab.lezzet.app/menu/kebab still works via slug route)
    }

    if (resolution.type === "custom_domain") {
      // Custom domain request (e.g., menu.kebabhouse.com)
      // Always rewrite to tenant route — the custom domain IS the menu.
      if (pathname === "/" || pathname === "") {
        const tenantUrl = new URL("/_tenant", request.url);
        return rewrite(tenantUrl, {
          [TENANT_HEADERS.DOMAIN]: resolution.domain,
          [TENANT_HEADERS.RESOLVED_VIA]: "custom_domain",
        });
      }
    }
  }

  // ── Existing auth & routing logic (unchanged) ────────────────

  // Protected routes
  const isProtected =
    pathname.startsWith("/restaurant-admin") ||
    pathname.startsWith("/super-admin");

  // If accessing protected route without auth → redirect to login
  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return redirect(loginUrl);
  }

  // If authenticated user visits /login → redirect to dashboard
  if (pathname === "/login" && user) {
    const role = await getProfileRole(user.id);

    if (role === "super_admin") {
      return redirect(new URL("/super-admin", request.url));
    }
    return redirect(new URL("/restaurant-admin", request.url));
  }

  // Role-based access enforcement
  if (isProtected && user) {
    const role = await getProfileRole(user.id);

    // Only enforce role routing when we successfully got a role.
    if (role) {
      if (
        pathname.startsWith("/super-admin") &&
        role !== "super_admin"
      ) {
        return redirect(new URL("/restaurant-admin", request.url));
      }

      if (
        pathname.startsWith("/restaurant-admin") &&
        role === "super_admin"
      ) {
        return redirect(new URL("/super-admin", request.url));
      }
    }
  }

  return supabaseResponse;
}
