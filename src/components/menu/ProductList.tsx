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
  const isRestaurant = restaurant.moduleType === "restaurant";

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
            {!isRestaurant && (
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                {cat.name}
              </h2>
            )}

            <div className="space-y-2">
              {cat.products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  hasImage={hasImage(product)}
                  cart={cart}
                  isRestaurant={isRestaurant}
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
                <span
                  className={`shrink-0 font-bold text-base ${!isRestaurant ? 'text-primary' : ''}`}
                  style={isRestaurant ? { color: "#c49a3c" } : undefined}
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
                  isRestaurant={isRestaurant}
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
            category={
              restaurant.categories.find((c) => c.id === arProduct.categoryId)?.name ?? null
            }
            poster={arProduct.image !== "/placeholder.svg" ? arProduct.image : undefined}
            onClose={() => setArProduct(null)}
          />
        </Suspense>
      )}

    </>
  );
}

// ── ProductRow ──────────────────────────────────────────────────────────────

interface ProductRowProps {
  product: Product;
  hasImage: boolean;
  cart: ReturnType<typeof useOptionalCart>;
  isRestaurant?: boolean;
  onSelect: () => void;
  onAR?: () => void;
}

function ProductRow({ product, hasImage, cart, isRestaurant, onSelect, onAR }: ProductRowProps) {
  const rowRef = useRef<HTMLButtonElement>(null);

  // ── Restaurant dark card ─────────────────────────────────────────────────
  if (isRestaurant) {
    const arReady = product.arModelUrl ? isModelReady(product.arModelUrl) : false;
    return (
      <button
        ref={rowRef}
        type="button"
        onClick={onSelect}
        disabled={!product.available}
        onMouseEnter={() => product.arModelUrl && preloadModel(product.arModelUrl)}
        onTouchStart={() => product.arModelUrl && preloadModel(product.arModelUrl)}
        style={{
          display: "flex",
          gap: 14,
          padding: 12,
          border: "1px solid rgba(196,154,60,0.25)",
          borderRadius: 18,
          background: "rgba(255,255,255,0.04)",
          width: "100%",
          textAlign: "left",
          cursor: product.available ? "pointer" : "not-allowed",
          opacity: product.available ? 1 : 0.4,
          transition: "transform 0.2s",
        }}
      >
        {hasImage ? (
          <div style={{ width: 100, height: 100, flexShrink: 0, borderRadius: 14, overflow: "hidden", position: "relative" }}>
            <OptimizedImage
              src={product.image}
              alt={product.name}
              variant="thumbnail"
              fill
              sizes="100px"
              className="object-cover"
            />
          </div>
        ) : (
          <div style={{ width: 100, height: 100, flexShrink: 0, borderRadius: 14, background: "rgba(255,255,255,0.06)" }} />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 20,
              fontWeight: 500,
              color: "#f5f1e8",
              lineHeight: 1.2,
              marginBottom: 4,
            }}
          >
            {product.name}
          </h3>
          {product.description && (
            <p
              style={{
                fontSize: 12,
                color: "#a89b8c",
                lineHeight: 1.4,
                marginBottom: 6,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {product.description}
            </p>
          )}
          <div style={{ fontWeight: 600, color: "#c49a3c", fontSize: 16, marginBottom: 10 }}>
            ₺{product.price.toFixed(2)}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {product.arModelUrl ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onAR?.(); }}
                className={arReady ? "r-ar-glow" : ""}
                style={{
                  fontSize: 10,
                  padding: "5px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(196,154,60,0.35)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  color: "#a89b8c",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <span>⬡</span> 3D Görsel
              </button>
            ) : (
              <span />
            )}

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
                style={{
                  padding: "7px 15px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: "#c49a3c",
                  color: "#0a0806",
                  border: "none",
                  transition: "opacity 0.2s",
                }}
              >
                + Ekle
              </button>
            )}
          </div>
        </div>
      </button>
    );
  }

  // ── Cafe card (unchanged) ────────────────────────────────────────────────
  return (
    <button
      ref={rowRef}
      type="button"
      onClick={onSelect}
      disabled={!product.available}
      // Also trigger preload on hover/touch (last-resort for slow connections)
      onMouseEnter={() => product.arModelUrl && preloadModel(product.arModelUrl)}
      onTouchStart={() => product.arModelUrl && preloadModel(product.arModelUrl)}
      className={`w-full flex items-start gap-3 p-2.5 rounded-xl bg-card border border-border text-left transition-shadow duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary outline-none ${
        !product.available ? "opacity-40 cursor-not-allowed" : ""
      }`}
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
          <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-1">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-muted-foreground text-xs leading-relaxed mt-0.5 line-clamp-2">
              {product.description}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-primary font-bold text-sm">₺{product.price.toFixed(2)}</p>
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
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
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
function ARButton({ modelUrl, onClick, isRestaurant }: { modelUrl: string; onClick: () => void; isRestaurant?: boolean }) {
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
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
          tapped ? "scale-95 opacity-90" : "scale-100"
        } ${ready ? "ar-pulse" : ""} ${!isRestaurant ? "bg-primary text-primary-foreground" : ""}`}
        style={
          isRestaurant
            ? { background: "#c49a3c", color: "#0a0806", border: "none" }
            : undefined
        }
      >
        <View className="w-4 h-4" />
        {tapped ? "Açılıyor..." : "Masanda Gör"}
      </button>
    </>
  );
}
