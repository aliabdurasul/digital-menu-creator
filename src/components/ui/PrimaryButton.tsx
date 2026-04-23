import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const PrimaryButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "h-12 px-6 bg-primary text-primary-foreground font-semibold rounded-[16px] transition-all duration-200",
          "active:scale-97 border border-transparent shadow-none hover:opacity-90",
          "disabled:opacity-50 disabled:pointer-events-none",
          className
        )}
        {...props}
      />
    );
  }
);
PrimaryButton.displayName = "PrimaryButton";