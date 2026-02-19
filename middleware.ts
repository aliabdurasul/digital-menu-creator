import { type NextRequest, NextResponse } from "next/server";
// import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // TODO: Uncomment when Supabase Auth is fully configured
  // return await updateSession(request);

  // ── Mock auth middleware ──
  // In production, this will:
  // 1. Refresh the Supabase session
  // 2. Check if user is authenticated for protected routes
  // 3. Verify user role matches required role for the route
  // 4. Redirect to login if unauthenticated

  const { pathname } = request.nextUrl;

  // Protected routes that require authentication
  const protectedRoutes = ["/restaurant-admin", "/super-admin"];
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtected) {
    // TODO: Replace with real auth check:
    // const supabase = createMiddlewareClient(request);
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) {
    //   return NextResponse.redirect(new URL('/login', request.url));
    // }
    //
    // For /restaurant-admin routes, check role:
    // const { data: profile } = await supabase
    //   .from('profiles')
    //   .select('role')
    //   .eq('id', user.id)
    //   .single();
    //
    // if (pathname.startsWith('/restaurant-admin') && profile?.role !== 'restaurant_admin') {
    //   return NextResponse.redirect(new URL('/unauthorized', request.url));
    // }
    // if (pathname.startsWith('/super-admin') && profile?.role !== 'super_admin') {
    //   return NextResponse.redirect(new URL('/unauthorized', request.url));
    // }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|images/|robots.txt).*)",
  ],
};
