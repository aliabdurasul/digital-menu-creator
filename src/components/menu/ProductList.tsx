"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product, Category } from "@/types";
import { Utensils, Scale, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";

interface ProductListProps {
  products: Product[];
  categories: Category[];
}

export function ProductList({ products, categories }: ProductListProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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

  const hasDetails = (p: Product) =>
    p.ingredients || p.portionInfo || p.allergenInfo;

  return (
    <>
      <div className="px-4 py-5 space-y-8">
        {categorySections.map((cat) => (
          <div key={cat.id} data-cat-id={cat.id}>
            <h2 className="text-[13px] font-semibold text-neutral-400 uppercase tracking-widest mb-4 mt-2 first:mt-0">
              {cat.name}
            </h2>

            {/* ── 2-column grid ── */}
            <div className="grid grid-cols-2 gap-3">
              {cat.products.map((product) => (
                <div
                  key={product.id}
                  className={cn(
                    "group rounded-3xl bg-white border border-neutral-100 overflow-hidden shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
                    !product.available && "opacity-50 pointer-events-none"
                  )}
                >
                  {/* ── Image — perfect square ── */}
                  {hasImage(product) && (
                    <div className="relative aspect-square overflow-hidden bg-neutral-100">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="(max-width:448px) 50vw, 210px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* ── Info ── */}
                  <div className="px-3 pt-2.5 pb-3 space-y-1.5">
                    <h3 className="font-semibold text-neutral-900 text-[13px] leading-tight line-clamp-2">
                      {product.name}
                    </h3>

                    <p className="font-bold text-emerald-600 text-sm">
                      ₺{product.price.toFixed(2)}
                    </p>

                    {product.description && (
                      <p className="text-neutral-400 text-[11px] leading-relaxed line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    {!product.available && (
                      <span className="text-[10px] font-medium text-red-500">
                        Tükendi
                      </span>
                    )}

                    {/* İçindekiler button → opens bottom sheet */}
                    {hasDetails(product) && (
                      <button
                        onClick={() => setSelectedProduct(product)}
                        className="mt-1 w-full text-center text-[11px] font-medium text-neutral-500 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 rounded-xl py-1.5 transition-colors"
                      >
                        İçindekiler
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom Sheet Drawer ── */}
      <Drawer
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      >
        <DrawerContent className="max-h-[85vh] rounded-t-3xl border-neutral-200">
          {selectedProduct && (
            <>
              <DrawerHeader className="relative pb-0">
                <DrawerClose className="absolute right-4 top-4 rounded-full bg-neutral-100 p-1.5 hover:bg-neutral-200 transition-colors">
                  <X className="w-4 h-4 text-neutral-500" />
                </DrawerClose>
                <DrawerTitle className="text-lg font-bold text-neutral-900 pr-10">
                  {selectedProduct.name}
                </DrawerTitle>
                <DrawerDescription className="text-emerald-600 font-bold text-base">
                  ₺{selectedProduct.price.toFixed(2)}
                </DrawerDescription>
              </DrawerHeader>

              <div className="px-4 pb-6 pt-4 space-y-4 overflow-y-auto">
                {/* Full image */}
                {hasImage(selectedProduct) && (
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-100">
                    <Image
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      fill
                      sizes="448px"
                      className="object-cover"
                    />
                  </div>
                )}

                {/* Full description */}
                {selectedProduct.description && (
                  <p className="text-neutral-600 text-sm leading-relaxed">
                    {selectedProduct.description}
                  </p>
                )}

                {/* İçindekiler / Ingredients */}
                {selectedProduct.ingredients && (
                  <div className="bg-neutral-50 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Utensils className="w-4 h-4 text-neutral-400" />
                      <h4 className="text-sm font-semibold text-neutral-900">İçindekiler</h4>
                    </div>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                      {selectedProduct.ingredients}
                    </p>
                  </div>
                )}

                {/* Porsiyon */}
                {selectedProduct.portionInfo && (
                  <div className="bg-neutral-50 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Scale className="w-4 h-4 text-neutral-400" />
                      <h4 className="text-sm font-semibold text-neutral-900">Porsiyon</h4>
                    </div>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                      {selectedProduct.portionInfo}
                    </p>
                  </div>
                )}

                {/* Alerjenler */}
                {selectedProduct.allergenInfo && (
                  <div className="bg-amber-50 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <h4 className="text-sm font-semibold text-neutral-900">Alerjenler</h4>
                    </div>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                      {selectedProduct.allergenInfo}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
