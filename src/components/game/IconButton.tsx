import React, { forwardRef } from "react";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  variant?: "primary" | "secondary" | "ghost";
  icon: React.ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { "aria-label": ariaLabel, variant = "secondary", icon, className = "", disabled, ...props },
    ref,
  ) => {
    const variantClass =
      variant === "primary"
        ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
        : variant === "secondary"
          ? "bg-[var(--card)] text-[var(--foreground)] border-2 border-[var(--control)] hover:bg-[var(--primary-soft)] hover:border-[var(--primary)]"
          : "bg-transparent text-[var(--foreground)] border-2 border-transparent hover:bg-[var(--primary-soft)]";

    return (
      <button
        ref={ref}
        type="button"
        aria-label={ariaLabel}
        disabled={disabled}
        className={`min-w-[48px] min-h-[48px] w-12 h-12 inline-flex items-center justify-center rounded-xl transition-all duration-120 cursor-pointer select-none active:translate-y-[1px] disabled:bg-[var(--disabled)] disabled:text-[var(--muted-foreground)] disabled:border-[var(--disabled)] disabled:cursor-not-allowed ${variantClass} ${className}`.trim()}
        {...props}
      >
        <span
          className="w-6 h-6 flex items-center justify-center [&>svg]:w-6 [&>svg]:h-6"
          aria-hidden="true"
        >
          {icon}
        </span>
      </button>
    );
  },
);

IconButton.displayName = "IconButton";
