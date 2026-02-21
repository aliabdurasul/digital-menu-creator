import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  const { pathname } = request.nextUrl;

  // Protected routes
  const isProtected =
    pathname.startsWith("/restaurant-admin") ||
    pathname.startsWith("/super-admin");

  // If accessing protected route without auth → redirect to login
  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated user visits /login → redirect to dashboard
  if (pathname === "/login" && user) {
    // Fetch role from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "super_admin") {
      return NextResponse.redirect(new URL("/super-admin", request.url));
    }
    return NextResponse.redirect(new URL("/restaurant-admin", request.url));
  }

  // Role-based access enforcement
  if (isProtected && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // Restaurant admin cannot access super admin
    if (
      pathname.startsWith("/super-admin") &&
      profile?.role !== "super_admin"
    ) {
      return NextResponse.redirect(
        new URL("/restaurant-admin", request.url)
      );
    }

    // Super admin cannot access restaurant admin (they use super-admin panel)
    if (
      pathname.startsWith("/restaurant-admin") &&
      profile?.role === "super_admin"
    ) {
      return NextResponse.redirect(new URL("/super-admin", request.url));
    }
  }

  return supabaseResponse;
}
