"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product, Category } from "@/types";
import { Utensils, Scale, AlertTriangle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductListProps {
  products: Product[];
  categories: Category[];
}

/* ------------------------------------------------------------------ */
/*  Premium 2-col grid — aspect-square images, no cropping issues     */
/*                                                                    */
/*  WHY aspect-square instead of fixed height (h-48) or aspect-video: */
/*  • aspect-square is responsive — it scales with the column width   */
/*    so the frame is always a perfect 1:1 ratio regardless of screen */
/*    size. A fixed h-48 would crop differently on every viewport.    */
/*  • Square frames work universally: landscape, portrait, and square */
/*    source images all look clean inside them with object-cover.     */
/*  • 1:1 grids feel premium (Instagram, DoorDash, Uber Eats all use */
/*    square thumbnails) and create visual rhythm.                    */
/*  • No stretching: the image is never distorted — object-cover     */
/*    fills the square by cropping the overflow, keeping aspect ratio.*/
/* ------------------------------------------------------------------ */
export function ProductList({ products, categories }: ProductListProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  const categorySections = sortedCategories
    .map((cat) => ({
      ...cat,
      products: products
        .filter((p) => p.categoryId === cat.id)
        .sort((a, b) => a.order - b.order),
    }))
    .filter((cat) => cat.products.length > 0);

  const hasImage = (p: Product) =>
    p.image && p.image !== "/placeholder.svg";

  const toggle = (id: string) =>
    setExpanded((prev) => (prev === id ? null : id));

  return (
    <div className="px-3 py-4 space-y-8">
      {categorySections.map((cat) => (
        <div key={cat.id} data-cat-id={cat.id}>
          <h2 className="text-[13px] font-semibold text-neutral-400 uppercase tracking-widest mb-4 mt-2 first:mt-0">
            {cat.name}
          </h2>

          {/* ── 2-column grid ── */}
          <div className="grid grid-cols-2 gap-3">
            {cat.products.map((product) => {
              const isExpanded = expanded === product.id;

              return (
                <div
                  key={product.id}
                  className={cn(
                    "group rounded-2xl bg-card border border-border/40 overflow-hidden shadow-sm transition-shadow duration-200 hover:shadow-lg",
                    !product.available && "opacity-50"
                  )}
                >
                  {/* ── Image — perfect square ── */}
                  {hasImage(product) && (
                    <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-muted">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="(max-width:480px) 50vw, 220px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* ── Info ── */}
                  <div className="px-3 pt-2.5 pb-3 space-y-1">
                    <h3 className="font-semibold text-card-foreground text-[13px] leading-tight line-clamp-2">
                      {product.name}
                    </h3>

                    <p className="font-bold text-primary text-sm">
                      ₺{product.price.toFixed(2)}
                    </p>

                    {product.description && (
                      <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    {!product.available && (
                      <span className="text-[10px] font-medium text-destructive">
                        Tükendi
                      </span>
                    )}

                    {/* Expandable details toggle */}
                    {(product.ingredients || product.portionInfo || product.allergenInfo) && (
                      <button
                        onClick={() => toggle(product.id)}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors pt-1"
                      >
                        Detaylar
                        <ChevronDown
                          className={cn(
                            "w-3 h-3 transition-transform duration-200",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </button>
                    )}

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="space-y-2 pt-2 border-t border-border/30 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                        {product.ingredients && (
                          <div className="flex items-start gap-1.5">
                            <Utensils className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                              {product.ingredients}
                            </p>
                          </div>
                        )}
                        {product.portionInfo && (
                          <div className="flex items-start gap-1.5">
                            <Scale className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                              {product.portionInfo}
                            </p>
                          </div>
                        )}
                        {product.allergenInfo && (
                          <div className="flex items-start gap-1.5">
                            <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                              {product.allergenInfo}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
