"use client";

import { useState, useCallback, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import type { Product } from "@/types";
import { OptimizedImage } from "@/components/OptimizedImage";
import { X, Plus, View } from "lucide-react";
import { useLanguage, UI_LABELS } from "@/components/menu/LanguageProvider";
import { useCart } from "@/components/menu/CartProvider";
import { preloadModel, isModelReady } from "@/lib/arPreloader";
import { RestaurantCard } from "@/components/ui/RestaurantCard";
import { ARButton } from "@/components/ui/ARButton";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

const ARViewer = lazy(() =>
  import("@/components/menu/ARViewer").then((m) => ({ default: m.ARViewer }))
);

function useOptionalCart() {
  try {
    return useCart();
  } catch {
    return null;
  }
}

export function ProductList({ tableId }: { tableId?: string }) {
  const { restaurant, language } = useLanguage();
  const { products } = restaurant;
  const cartContext = useOptionalCart();
  // Show add-to-cart whenever a CartProvider is mounted above us,
  // regardless of whether a tableId was passed (supports self-service route).
  const cart = cartContext;

  const sortedCategories = useMemo(
    () => [...restaurant.categories].sort((a, b) => a.order - b.order),
    [restaurant.categories]
  );

  const [selected, setSelected] = useState<Product | null>(null);
  const [arProduct, setArProduct] = useState<Product | null>(null);

  // Keep modal product synced with language switch
  const activeSelected = useMemo(() => {
    if (!selected) return null;
    return products.find((p) => p.id === selected.id) ?? selected;
  }, [selected, products]);

  const categorySections = useMemo(
    () =>
      sortedCategories
        .map((cat) => ({
          ...cat,
          products: products
            .filter((p) => p.categoryId === cat.id)
            .sort((a, b) => a.order - b.order),
        }))
        .filter((cat) => cat.products.length > 0),
    [sortedCategories, products]
  );

  const hasImage = (p: Product) => !!(p.image && p.image !== "/placeholder.svg");
  const close = useCallback(() => setSelected(null), []);

  useEffect(() => {
    if (activeSelected || arProduct) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [activeSelected, arProduct]);

  useEffect(() => {
    if (!activeSelected) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [activeSelected, close]);

  return (
    <>
      <div className="px-4 py-4 space-y-7">
        {categorySections.map((cat) => (
          <section key={cat.id} data-cat-id={cat.id}>
            <div className="space-y-2">
              {cat.products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  cart={cart}
                  onSelect={() => product.available && setSelected(product)}
                  onAR={() => setArProduct(product)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* ── Centered modal ── */}
      {activeSelected && (
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

            {hasImage(activeSelected) && (
              <div className="relative aspect-[4/3] bg-muted">
                <OptimizedImage
                  src={activeSelected.image}
                  alt={activeSelected.name}
                  variant="large"
                  fill
                  sizes="(max-width: 480px) 100vw, 400px"
                  className="object-cover"
                />
              </div>
            )}

            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold text-foreground leading-tight">
                  {activeSelected.name}
                </h3>
                <span className="shrink-0 text-primary font-bold text-base">
                  ₺{activeSelected.price.toFixed(2)}
                </span>
              </div>

              {activeSelected.ingredients && (
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    {UI_LABELS.ingredients[language]}
                  </span>
                  <p className="text-sm text-foreground/80 mt-0.5 leading-relaxed">
                    {activeSelected.ingredients}
                  </p>
                </div>
              )}

              {activeSelected.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {activeSelected.description}
                </p>
              )}

              {activeSelected.portionInfo && (
                <p className="text-xs text-muted-foreground">
                  {UI_LABELS.portion[language]} {activeSelected.portionInfo}
                </p>
              )}

              {activeSelected.allergenInfo && (
                <p className="text-xs text-amber-600">
                  ⚠ {activeSelected.allergenInfo}
                </p>
              )}

              {activeSelected.arModelUrl && (
                <div className="mt-4">
                  <ARButton
                    modelUrl={activeSelected.arModelUrl}
                    onClick={() => { close(); setArProduct(activeSelected); }}
                  />
                </div>
              )}

              {cart && activeSelected.available && (
                <div className="pt-2">
                  <PrimaryButton
                    className="w-full justify-center py-6"
                    onClick={() => {
                      cart.addItem({
                        lineId: activeSelected.id,
                        menuItemId: activeSelected.id,
                        name: activeSelected.name,
                        price: activeSelected.price,
                        image: activeSelected.image,
                      });
                      close();
                    }}
                  >
                    <Plus className="w-5 h-5 mr-1" />
                    Sepete Ekle
                  </PrimaryButton>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── AR Viewer modal ── */}
      {arProduct && arProduct.arModelUrl && (
        <Suspense fallback={null}>
          <ARViewer
            src={arProduct.arModelUrl}
            name={arProduct.name}
            sizeCm={arProduct.arModelSizeCm}
            poster={arProduct.image !== "/placeholder.svg" ? arProduct.image : undefined}
            onClose={() => setArProduct(null)}
          />
        </Suspense>
      )}
    </>
  );
}

// ── ProductRow ──────────────────────────────────────────────────────────────
// Handles per-product IntersectionObserver preloading (200px rootMargin).
interface ProductRowProps {
  product: Product;
  cart: ReturnType<typeof useOptionalCart>;
  onSelect: () => void;
  onAR?: () => void;
}

function ProductRow({ product, cart, onSelect, onAR }: ProductRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!product.arModelUrl) return;
    const el = rowRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          preloadModel(product.arModelUrl);
          obs.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [product.arModelUrl]);

  const arReady = product.arModelUrl ? isModelReady(product.arModelUrl) : false;

  const handleAdd = cart && product.available ? () => {
    cart.addItem({
      lineId: product.id,
      menuItemId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    });
  } : undefined;

  return (
    <div ref={rowRef}>
      <RestaurantCard
        product={product}
        onSelect={onSelect}
        onAR={onAR}
        onAdd={handleAdd}
        isARReady={arReady}
      />
    </div>
  );
}

// ── ARButton ─────────────────────────────────────────────────────────────────
// Shows a pulse badge when model is preloaded. Tap feedback (scale + label).
function ARButton({ modelUrl, onClick }: { modelUrl: string; onClick: () => void }) {
  const [tapped, setTapped] = useState(false);
  const ready = isModelReady(modelUrl);

  return (
    <>
      <style>{`
        @keyframes ar-pulse {
          0%, 100% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0.4); }
          50%       { box-shadow: 0 0 0 6px hsl(var(--primary) / 0); }
        }
        .ar-pulse { animation: ar-pulse 2.4s ease-in-out infinite; }
      `}</style>
      <button
        type="button"
        onPointerDown={() => setTapped(true)}
        onPointerUp={() => setTapped(false)}
        onPointerLeave={() => setTapped(false)}
        onClick={onClick}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium transition-all duration-150 ${
          tapped ? "scale-95 opacity-90" : "scale-100"
        } ${ready ? "ar-pulse" : ""}`}
      >
        <View className="w-4 h-4" />
        {tapped ? "Açılıyor..." : "Masanda Gör"}
      </button>
    </>
  );
}
