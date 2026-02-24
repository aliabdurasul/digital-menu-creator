"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import type { Product, Category } from "@/types";
import { X } from "lucide-react";

interface ProductListProps {
  products: Product[];
  categories: Category[];
}

export function ProductList({ products, categories }: ProductListProps) {
  const [selected, setSelected] = useState<Product | null>(null);

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
  const categorySections = sortedCategories
    .map((cat) => ({
      ...cat,
      products: products
        .filter((p) => p.categoryId === cat.id)
        .sort((a, b) => a.order - b.order),
    }))
    .filter((cat) => cat.products.length > 0);

  const hasImage = (p: Product) => p.image && p.image !== "/placeholder.svg";
  const close = useCallback(() => setSelected(null), []);

  useEffect(() => {
    if (selected) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [selected, close]);

  return (
    <>
      <div className="px-4 py-4 space-y-7">
        {categorySections.map((cat) => (
          <section key={cat.id} data-cat-id={cat.id}>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              {cat.name}
            </h2>

            <div className="space-y-2">
              {cat.products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => product.available && setSelected(product)}
                  disabled={!product.available}
                  className={`w-full flex items-start gap-3 p-2.5 rounded-xl bg-card border border-border text-left transition-shadow duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary outline-none ${
                    !product.available ? "opacity-40 cursor-not-allowed" : ""
                  }`}
                >
                  {/* Square thumbnail */}
                  {hasImage(product) ? (
                    <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-muted">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 shrink-0 rounded-lg bg-muted" />
                  )}

                  {/* Text content */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                    <div>
                      <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-1">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-muted-foreground text-xs leading-relaxed mt-0.5 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                    </div>
                    <p className="text-primary font-bold text-sm text-right mt-1">
                      ₺{product.price.toFixed(2)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* ── Centered modal ── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={close}
        >
          <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" />

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-sm bg-card rounded-2xl shadow-xl border border-border overflow-hidden animate-fade-in"
          >
            <button
              type="button"
              onClick={close}
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
            >
              <X className="w-4 h-4 text-foreground" />
            </button>

            {hasImage(selected) && (
              <div className="relative aspect-[4/3] bg-muted">
                <Image
                  src={selected.image}
                  alt={selected.name}
                  fill
                  sizes="400px"
                  className="object-cover"
                />
              </div>
            )}

            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold text-foreground leading-tight">
                  {selected.name}
                </h3>
                <span className="shrink-0 text-primary font-bold text-base">
                  ₺{selected.price.toFixed(2)}
                </span>
              </div>

              {selected.ingredients && (
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Malzemeler
                  </span>
                  <p className="text-sm text-foreground/80 mt-0.5 leading-relaxed">
                    {selected.ingredients}
                  </p>
                </div>
              )}

              {selected.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selected.description}
                </p>
              )}

              {selected.portionInfo && (
                <p className="text-xs text-muted-foreground">
                  Porsiyon: {selected.portionInfo}
                </p>
              )}

              {selected.allergenInfo && (
                <p className="text-xs text-amber-600">
                  ⚠ {selected.allergenInfo}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
