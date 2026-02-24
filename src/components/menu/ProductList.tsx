"use client";

import Image from "next/image";
import type { Product, Category } from "@/types";
import { Utensils, Scale, AlertTriangle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ProductListProps {
  products: Product[];
  categories: Category[];
}

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
    <div className="px-4 py-4 space-y-6">
      {categorySections.map((cat) => (
        <div key={cat.id} data-cat-id={cat.id}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {cat.name}
          </h2>

          <div className="space-y-3">
            {cat.products.map((product) => (
              <div
                key={product.id}
                className={`rounded-2xl bg-card border border-border overflow-hidden shadow-sm ${
                  !product.available ? "opacity-50" : ""
                }`}
              >
                {product.image && product.image !== "/placeholder.svg" && (
                  <div className="relative aspect-video overflow-hidden">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(max-width: 480px) 100vw, 480px"
                      className="object-cover"
                      loading="lazy"
                    />
                  </div>
                )}

                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground text-sm leading-tight">
                      {product.name}
                    </h3>
                    <span className="shrink-0 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-lg">
                      ₺{product.price.toFixed(2)}
                    </span>
                  </div>

                  {product.description && (
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {product.description}
                    </p>
                  )}

                  {!product.available && (
                    <span className="text-xs font-medium text-destructive">
                      Tükendi
                    </span>
                  )}

                  {(product.ingredients || product.portionInfo || product.allergenInfo) && (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="details" className="border-none">
                        <AccordionTrigger className="text-xs text-muted-foreground py-1 hover:no-underline">
                          Malzemeler
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2 pt-1 pb-2">
                          {product.ingredients && (
                            <div className="flex items-start gap-2 text-xs">
                              <Utensils className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                              <span className="text-muted-foreground">{product.ingredients}</span>
                            </div>
                          )}
                          {product.portionInfo && (
                            <div className="flex items-start gap-2 text-xs">
                              <Scale className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                              <span className="text-muted-foreground">{product.portionInfo}</span>
                            </div>
                          )}
                          {product.allergenInfo && (
                            <div className="flex items-start gap-2 text-xs">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
                              <span className="text-muted-foreground">{product.allergenInfo}</span>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
