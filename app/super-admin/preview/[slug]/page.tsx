import { notFound } from "next/navigation";
import Link from "next/link";
import { getRestaurantBySlug } from "@/lib/db";
import { MenuShell } from "@/components/menu/MenuShell";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const revalidate = 60;

interface PreviewPageProps {
  params: { slug: string };
}

export async function generateMetadata({
  params,
}: PreviewPageProps): Promise<Metadata> {
  const restaurant = await getRestaurantBySlug(params.slug);
  if (!restaurant) return { title: "Önizleme — Bulunamadı" };
  return { title: `Önizleme — ${restaurant.name}` };
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const restaurant = await getRestaurantBySlug(params.slug);

  if (!restaurant) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center">
      {/* ── Toolbar ── */}
      <div className="w-full max-w-2xl px-4 pt-6 pb-4 flex items-center gap-4">
        <Link
          href="/super-admin"
          className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Panel</span>
        </Link>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm font-semibold text-white truncate max-w-[200px]">
            {restaurant.name}
          </span>
          <Badge
            variant={restaurant.plan === "pro" ? "default" : "secondary"}
            className="text-[10px] uppercase tracking-wider"
          >
            {restaurant.plan}
          </Badge>
        </div>

        <a
          href={`/menu/${restaurant.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors ml-2"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Menüyü Aç</span>
        </a>
      </div>

      {/* ── Phone Mockup ── */}
      <div className="relative flex-1 flex items-start justify-center pb-10">
        {/* Outer bezel */}
        <div className="relative w-[375px] bg-neutral-800 rounded-[3rem] p-[10px] shadow-2xl shadow-black/60 ring-1 ring-white/5">
          {/* Dynamic Island */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 mt-[14px]">
            <div className="w-[120px] h-[34px] bg-black rounded-full" />
          </div>

          {/* Screen area */}
          <div
            className="relative bg-white rounded-[2.4rem] overflow-hidden"
            style={{ height: "812px" }}
          >
            <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin">
              <MenuShell restaurant={restaurant} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Slug label ── */}
      <div className="pb-6 text-center">
        <span className="text-xs text-neutral-600 font-mono">
          /menu/{restaurant.slug}
        </span>
      </div>
    </div>
  );
}
