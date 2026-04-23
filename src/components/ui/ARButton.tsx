import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ARButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isReady?: boolean;
}

export const ARButton = forwardRef<HTMLButtonElement, ARButtonProps>(
  ({ className, isReady, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "inline-flex items-center justify-center gap-1.5 px-3 py-1.5",
          "rounded-xl border border-border bg-secondary text-muted-foreground text-xs font-medium",
          "transition-all duration-200 active:scale-97 hover:text-foreground",
          isReady && "shadow-[0_0_15px_hsl(var(--primary)/0.3)] border-primary/50 text-foreground",
          className
        )}
        {...props}
      >
        <span className="text-[10px]">⬡</span>
        {children || "3D View"}
      </button>
    );
  }
);
ARButton.displayName = "ARButton";