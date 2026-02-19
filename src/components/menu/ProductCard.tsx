import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <div
      className={`flex gap-4 p-4 rounded-2xl bg-card border border-border/50 transition-all duration-200 hover:shadow-md ${
        !product.available ? "opacity-60" : ""
      }`}
    >
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-muted">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
        />
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
        <p className="text-muted-foreground text-xs sm:text-sm mt-1 line-clamp-2">
          {product.description}
        </p>
        <p className="font-bold text-primary mt-2 text-sm sm:text-base">
          ${product.price.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
