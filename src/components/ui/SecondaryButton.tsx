import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const SecondaryButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "h-12 px-6 bg-secondary text-secondary-foreground font-semibold rounded-[16px] transition-all duration-200",
          "border border-border shadow-none hover:opacity-90 active:scale-97",
          "disabled:opacity-50 disabled:pointer-events-none",
          className
        )}
        {...props}
      />
    );
  }
);
SecondaryButton.displayName = "SecondaryButton";