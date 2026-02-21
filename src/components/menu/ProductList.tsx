"use client";

import Image from "next/image";
import type { Product, Category } from "@/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Utensils, Scale, AlertTriangle } from "lucide-react";

interface ProductListProps {
  products: Product[];
  categories: Category[];
}

/* ------------------------------------------------------------------ */
/*  Mobile-first product cards                                        */
/*  Collapsed : image (16:9) → name + price → 2-line desc → chevron   */
/*  Expanded  : full desc, ingredients, portion, allergens             */
/* ------------------------------------------------------------------ */
export function ProductList({ products, categories }: ProductListProps) {
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

  return (
    <div className="px-3 py-4 space-y-8">
      <Accordion type="single" collapsible className="w-full">
        {categorySections.map((cat) => (
          <div key={cat.id} data-cat-id={cat.id}>
            <h2 className="text-base font-semibold text-muted-foreground/70 uppercase tracking-wide mb-3 mt-6 first:mt-0">
              {cat.name}
            </h2>

            <div className="space-y-3">
              {cat.products.map((product) => (
                <AccordionItem
                  key={product.id}
                  value={product.id}
                  className="border-0"
                >
                  {/* ── Card shell ── */}
                  <div
                    className={`rounded-2xl bg-card border border-border/40 overflow-hidden shadow-sm ${
                      !product.available ? "opacity-50" : ""
                    }`}
                  >
                    {/* Image — 16 : 9 */}
                    {hasImage(product) && (
                      <div className="relative w-full aspect-video bg-muted">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          sizes="(max-width:480px) 100vw, 440px"
                          className="object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Trigger — name + price + desc + chevron */}
                    <AccordionTrigger className="w-full px-4 py-3 hover:no-underline">
                      <div className="flex flex-col min-w-0 flex-1 text-left gap-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-card-foreground text-[15px] leading-snug truncate">
                            {product.name}
                          </h3>
                          <span className="font-bold text-primary text-[15px] whitespace-nowrap">
                            ₺{product.price.toFixed(2)}
                          </span>
                        </div>

                        {product.description && (
                          <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">
                            {product.description}
                          </p>
                        )}

                        {!product.available && (
                          <span className="text-[11px] font-medium text-destructive">
                            Tükendi
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>

                    {/* Expanded details */}
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-3 border-t border-border/30 pt-3">
                        {/* Ingredients */}
                        {product.ingredients && (
                          <div className="flex items-start gap-2">
                            <Utensils className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-foreground">Malzemeler</p>
                              <p className="text-xs text-muted-foreground">{product.ingredients}</p>
                            </div>
                          </div>
                        )}

                        {/* Portion */}
                        {product.portionInfo && (
                          <div className="flex items-start gap-2">
                            <Scale className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-foreground">Porsiyon</p>
                              <p className="text-xs text-muted-foreground">{product.portionInfo}</p>
                            </div>
                          </div>
                        )}

                        {/* Allergens */}
                        {product.allergenInfo && (
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-foreground">Alerjenler</p>
                              <p className="text-xs text-muted-foreground">{product.allergenInfo}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </div>
                </AccordionItem>
              ))}
            </div>
          </div>
        ))}
      </Accordion>
    </div>
  );
}
