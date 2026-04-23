import type { Product } from "@/types";
import { OptimizedImage } from "@/components/OptimizedImage";
import { ARButton } from "./ARButton";
import { PrimaryButton } from "./PrimaryButton";

interface RestaurantCardProps {
  product: Product;
  onSelect: () => void;
  onAR?: () => void;
  onAdd?: () => void;
  isARReady?: boolean;
}

export function RestaurantCard({ product, onSelect, onAR, onAdd, isARReady }: RestaurantCardProps) {
  const hasImage = !!product.image;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!product.available}
      className={`relative flex gap-3.5 p-3 w-full text-left transition-all duration-200 active:scale-[0.98] outline-none touch-manipulation group
        bg-card border border-border rounded-[18px]
        ${product.available ? "opacity-100" : "opacity-40 cursor-not-allowed"}
      `}
    >
      <div className="w-[100px] h-[100px] shrink-0 rounded-[14px] bg-secondary relative overflow-hidden flex items-center justify-center">
        {hasImage ? (
          <OptimizedImage
            src={product.image}
            alt={product.name}
            variant="thumbnail"
            fill
            sizes="100px"
            className="object-cover"
          />
        ) : null}
      </div>

      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          <h3 className="font-serif text-[20px] font-medium text-foreground leading-[1.2] mb-1">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-[12px] text-muted-foreground leading-snug mb-2 line-clamp-2">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex items-end justify-between mt-auto">
          <div className="font-semibold text-primary text-[16px]">
            ₺{product.price.toFixed(2)}
          </div>

          <div className="flex items-center gap-2">
            {product.arModelUrl && (
              <ARButton
                isReady={isARReady}
                onClick={(e) => {
                  e.stopPropagation();
                  onAR?.();
                }}
              />
            )}

            {onAdd && product.available && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd();
                }}
                className="h-8 px-4 rounded-[12px] font-semibold text-[13px] bg-primary text-primary-foreground transition-all duration-200 active:scale-[0.94] hover:opacity-90"
              >
                + Ekle
              </button>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}