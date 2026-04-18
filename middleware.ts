import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Refresh Supabase session on every request
  const response = await updateSession(request);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, favicon.svg (favicon files)
     * - images/, icons/ (public static assets)
     * - robots.txt, sitemap (SEO files)
     * - manifest.json, sw.js, firebase-messaging-sw.js (PWA files)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|images/|icons/|robots\\.txt|sitemap|manifest\\.json|sw\\.js|firebase-messaging-sw\\.js).*)",
  ],
};
