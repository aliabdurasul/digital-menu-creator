import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { resolveTenantByDomain, isIgnoredHost, TENANT_HEADERS } from "@/lib/tenant";

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

export async function updateSession(request: NextRequest) {
  /* ── Skip tenant rewrite for API routes and static assets ── */
  const pathname = request.nextUrl.pathname;
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/manifest.json" ||
    pathname === "/firebase-messaging-sw.js" ||
    pathname === "/sw.js" ||
    pathname === "/favicon.svg" ||
    pathname === "/robots.txt" ||
    pathname.startsWith("/icons/")
  ) {
    // Fall through to normal routing — no tenant rewrite
    return NextResponse.next({ request });
  }

  /* ── Domain-based tenant resolution (before auth) ── */
  const host = request.headers.get("host") ?? "";
  if (host && !isIgnoredHost(host)) {
    try {
      const tenant = await resolveTenantByDomain(host);
      if (tenant.type === "domain" && tenant.restaurantId && tenant.slug) {
        // Rewrite to internal /_tenant route, passing tenant info as headers
        const url = request.nextUrl.clone();
        url.pathname = "/_tenant";
        const headers = new Headers(request.headers);
        headers.set(TENANT_HEADERS.id, tenant.restaurantId);
        headers.set(TENANT_HEADERS.slug, tenant.slug);
        headers.set(TENANT_HEADERS.domain, tenant.domain ?? host);
        return NextResponse.rewrite(url, { request: { headers } });
      }
    } catch (err) {
      console.error("[middleware] Domain resolution error:", err);
      // Fall through to normal routing
    }
  }

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

  const { pathname } = request.nextUrl;

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
