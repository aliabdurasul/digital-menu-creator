import Image from "next/image";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const hasImage = product.image && product.image !== "/placeholder.svg";

  return (
    <div
      className={`flex gap-3 p-3 sm:p-4 rounded-2xl bg-card border border-border/50 touch-manipulation ${
        !product.available ? "opacity-60" : ""
      }`}
    >
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-muted">
        {hasImage ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 80px, 96px"
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            No image
          </div>
        )}
        {!product.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
            <span className="text-xs font-bold text-primary-foreground bg-destructive px-2 py-1 rounded-full">
              Sold Out
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center min-w-0 flex-1">
        <h3 className="font-bold text-card-foreground text-sm sm:text-base leading-tight">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-muted-foreground text-xs sm:text-sm mt-1 line-clamp-2">
            {product.description}
          </p>
        )}
        <p className="font-bold text-primary mt-2 text-sm sm:text-base">
          ${product.price.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
