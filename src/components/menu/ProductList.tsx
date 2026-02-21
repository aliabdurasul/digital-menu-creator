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

/**
 * Accordion-style product list for the public menu.
 * - One item open at a time across the entire menu
 * - Collapsed: name, price, 1-line description, chevron
 * - Expanded: full description, image, ingredients, portion, allergens
 */
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

  return (
    <div className="px-3 py-4 space-y-6">
      <Accordion type="single" collapsible className="w-full">
        {categorySections.map((cat) => (
          <div key={cat.id} data-cat-id={cat.id}>
            <h2 className="text-lg font-bold text-foreground mb-2 mt-4 first:mt-0">
              {cat.name}
            </h2>
            {cat.products.map((product) => (
              <AccordionItem
                key={product.id}
                value={product.id}
                className="border-b-0 mb-2"
              >
                <AccordionTrigger
                  className={`rounded-2xl bg-card border border-border/50 px-4 py-3 hover:no-underline [&[data-state=open]]:rounded-b-none [&[data-state=open]]:border-b-0 ${
                    !product.available ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex flex-1 items-center gap-3 min-w-0 pr-2">
                    <div className="flex flex-col min-w-0 flex-1 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-card-foreground text-sm sm:text-base leading-tight truncate">
                          {product.name}
                        </h3>
                        <span className="font-bold text-primary text-sm sm:text-base whitespace-nowrap">
                          ₺{product.price.toFixed(2)}
                        </span>
                      </div>
                      {product.description && (
                        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 truncate">
                          {product.description}
                        </p>
                      )}
                      {!product.available && (
                        <span className="text-xs font-medium text-destructive mt-0.5">
                          Tükendi
                        </span>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="rounded-b-2xl bg-card border border-t-0 border-border/50 px-4">
                  <div className="space-y-3 pt-1">
                    {/* Image */}
                    {product.image &&
                      product.image !== "/placeholder.svg" && (
                        <div className="relative w-full h-44 rounded-xl overflow-hidden bg-muted">
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            sizes="(max-width: 480px) 100vw, 440px"
                            className="object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}

                    {/* Full description */}
                    {product.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {product.description}
                      </p>
                    )}

                    {/* Ingredients */}
                    {product.ingredients && (
                      <div className="flex items-start gap-2">
                        <Utensils className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-foreground">
                            Malzemeler
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {product.ingredients}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Portion info */}
                    {product.portionInfo && (
                      <div className="flex items-start gap-2">
                        <Scale className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-foreground">
                            Porsiyon
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {product.portionInfo}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Allergen info */}
                    {product.allergenInfo && (
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-foreground">
                            Alerjenler
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {product.allergenInfo}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </div>
        ))}
      </Accordion>
    </div>
  );
}
