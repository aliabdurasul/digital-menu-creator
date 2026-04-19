import { NextRequest, NextResponse } from "next/server";
import { getRestaurantBySlug } from "@/lib/db";

/**
 * GET /api/manifest/[slug] — Dynamic PWA manifest per restaurant.
 * Returns a tenant-specific manifest.json with correct name, start_url, and scope
 * so the PWA installs as the restaurant's branded app (not the whole system).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const restaurant = await getRestaurantBySlug(params.slug);

  if (!restaurant) {
    return NextResponse.json(
      { error: "Restaurant not found" },
      { status: 404 }
    );
  }

  const startUrl = `/r/${params.slug}`;
  const logoUrl = restaurant.logo || "/favicon.svg";

  const manifest = {
    name: restaurant.name,
    short_name: restaurant.name.length > 12
      ? restaurant.name.substring(0, 12)
      : restaurant.name,
    description: restaurant.description || `${restaurant.name} dijital menü`,
    start_url: startUrl,
    scope: `/r/${params.slug}`,
    display: "standalone" as const,
    orientation: "portrait-primary" as const,
    background_color: "#ffffff",
    theme_color: "#0f172a",
    lang: "tr",
    dir: "ltr",
    categories: ["food", "shopping", "lifestyle"],
    icons: [
      {
        src: logoUrl,
        sizes: "any",
        type: logoUrl.endsWith(".svg") ? "image/svg+xml" : "image/png",
        purpose: "any",
      },
      {
        src: logoUrl,
        sizes: "192x192",
        type: logoUrl.endsWith(".svg") ? "image/svg+xml" : "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Menüye Git",
        short_name: "Menü",
        description: `${restaurant.name} menüsünü aç`,
        url: startUrl,
        icons: [{ src: logoUrl, sizes: "any" }],
      },
    ],
  };

  return new NextResponse(JSON.stringify(manifest), {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
