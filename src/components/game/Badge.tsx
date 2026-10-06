import { Check } from "lucide-react";
import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "neutral";
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "success",
  icon,
  children,
  className = "",
  ...props
}) => {
  const variantClass =
    variant === "success"
      ? "bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]/30 font-semibold"
      : "bg-[var(--secondary)] text-[var(--foreground)] border border-[var(--border)] font-medium";

  const defaultIcon =
    variant === "success" ? <Check className="w-4 h-4 shrink-0" aria-hidden="true" /> : null;

  return (
    <span
      tabIndex={-1}
      className={`inline-flex items-center min-h-[28px] h-7 px-2 gap-1 rounded-full text-sm leading-none select-none ${variantClass} ${className}`.trim()}
      {...props}
    >
      {icon ?? defaultIcon}
      <span>{children}</span>
    </span>
  );
};
