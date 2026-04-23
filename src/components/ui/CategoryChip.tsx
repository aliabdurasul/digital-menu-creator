import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface CategoryChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
}

export const CategoryChip = forwardRef<HTMLButtonElement, CategoryChipProps>(
  ({ isActive, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "whitespace-nowrap px-5 py-2.5 min-h-[44px] rounded-[16px] text-[15px] font-medium",
          "transition-all duration-300 shrink-0 touch-manipulation active:scale-[0.97]",
          "border",
          isActive
            ? "bg-primary text-primary-foreground border-transparent shadow-none"
            : "bg-transparent text-muted-foreground border-border hover:text-foreground",
          className
        )}
        {...props}
      />
    );
  }
);
CategoryChip.displayName = "CategoryChip";