"use client";

import { useState, useCallback, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import type { Product } from "@/types";
import { OptimizedImage } from "@/components/OptimizedImage";
import { X, Plus, View } from "lucide-react";
import { useLanguage, UI_LABELS } from "@/components/menu/LanguageProvider";
import { useCart } from "@/components/menu/CartProvider";
import { preloadModel, isModelReady } from "@/lib/arPreloader";

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
      <div className="px-4 py-6 space-y-10">
        {categorySections.map((cat) => (
          <section key={cat.id} data-cat-id={cat.id}>
            <h2
              className="mb-4"
              style={{
                fontFamily: "var(--font-outfit, sans-serif)",
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.34em",
                textTransform: "uppercase",
                color: "rgba(196,154,60,0.55)",
              }}
            >
              {cat.name}
            </h2>

            <div className="space-y-2">
              {cat.products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  hasImage={hasImage(product)}
                  cart={cart}
                  onSelect={() => product.available && setSelected(product)}
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
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

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
                <h3
                  style={{
                    fontFamily: "var(--font-cormorant, 'Georgia', serif)",
                    fontStyle: "italic",
                    fontWeight: 500,
                    fontSize: "1.65rem",
                    lineHeight: 1.1,
                    color: "inherit",
                  }}
                >
                  {activeSelected.name}
                </h3>
                <span
                  className="shrink-0"
                  style={{
                    fontFamily: "var(--font-outfit, sans-serif)",
                    fontWeight: 500,
                    fontSize: "1rem",
                    color: "#c49a3c",
                  }}
                >
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
                <ARButton
                  modelUrl={activeSelected.arModelUrl}
                  onClick={() => { close(); setArProduct(activeSelected); }}
                />
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
  hasImage: boolean;
  cart: ReturnType<typeof useOptionalCart>;
  onSelect: () => void;
}

function ProductRow({ product, hasImage, cart, onSelect }: ProductRowProps) {
  const rowRef = useRef<HTMLButtonElement>(null);

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

  return (
    <button
      ref={rowRef}
      type="button"
      onClick={onSelect}
      disabled={!product.available}
      // Also trigger preload on hover/touch (last-resort for slow connections)
      onMouseEnter={() => product.arModelUrl && preloadModel(product.arModelUrl)}
      onTouchStart={() => product.arModelUrl && preloadModel(product.arModelUrl)}
      className={`w-full flex items-start gap-3 p-3 rounded-2xl text-left transition-all duration-200 outline-none focus-visible:ring-1 ${
        !product.available ? "opacity-40 cursor-not-allowed" : ""
      }`}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(196,154,60,0.12)",
      }}
    >
      {hasImage ? (
        <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-muted">
          <OptimizedImage
            src={product.image}
            alt={product.name}
            variant="thumbnail"
            fill
            sizes="80px"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="w-20 h-20 shrink-0 rounded-lg bg-muted" />
      )}

      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
        <div>
          <h3
            className="leading-snug line-clamp-1 text-foreground"
            style={{
              fontFamily: "var(--font-cormorant, 'Georgia', serif)",
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: "1.1rem",
            }}
          >
            {product.name}
          </h3>
          {product.description && (
            <p className="text-muted-foreground text-xs leading-relaxed mt-0.5 line-clamp-2">
              {product.description}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <p style={{ fontFamily: "var(--font-outfit, sans-serif)", fontWeight: 500, fontSize: "0.85rem", color: "#c49a3c" }}>₺{product.price.toFixed(2)}</p>
          {cart && product.available && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cart.addItem({
                  lineId: product.id,
                  menuItemId: product.id,
                  name: product.name,
                  price: product.price,
                  image: product.image,
                });
              }}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={{ background: "rgba(196,154,60,0.15)", border: "1px solid rgba(196,154,60,0.4)", color: "#c49a3c" }}
            >
              <Plus className="w-3 h-3" />
              Ekle
            </button>
          )}
        </div>
      </div>
    </button>
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
        className={`w-full flex items-center justify-center gap-2.5 transition-all duration-150 ${
          tapped ? "scale-95 opacity-70" : "scale-100"
        } ${ready ? "ar-pulse" : ""}`}
        style={{
          padding: "11px 16px",
          borderRadius: 12,
          border: "1px solid rgba(196,154,60,0.45)",
          background: "rgba(196,154,60,0.07)",
          color: "#c49a3c",
          fontSize: 12,
          fontFamily: "var(--font-outfit, sans-serif)",
          fontWeight: 500,
          letterSpacing: "0.1em",
          cursor: "pointer",
        }}
      >
        <View className="w-3.5 h-3.5" style={{ color: "#c49a3c" }} />
        {tapped ? "Açılıyor..." : "Masanda Deneyimle"}
      </button>
    </>
  );
}
