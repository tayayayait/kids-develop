import { AlertCircle } from "lucide-react";
import React from "react";

export interface ErrorPanelProps {
  title: string;
  description: string;
  code?: string | undefined;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const ErrorPanel: React.FC<ErrorPanelProps> = ({
  title,
  description,
  code,
  icon,
  actions,
  className = "",
}) => {
  return (
    <div
      role="alert"
      className={`w-full max-w-[560px] mx-auto p-6 bg-[var(--card)] rounded-2xl shadow-[var(--shadow-card)] border border-[var(--border)] flex flex-col items-center text-center gap-4 ${className}`.trim()}
    >
      <div className="w-12 h-12 flex items-center justify-center text-[var(--destructive)]">
        {icon ?? <AlertCircle className="w-12 h-12" aria-hidden="true" />}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold leading-[1.417] text-[var(--foreground)]">{title}</h2>
        <p className="text-lg leading-[1.556] text-[var(--muted-foreground)]">{description}</p>
      </div>

      {code && (
        <span className="text-xs text-[var(--control)] font-mono tabular-nums tracking-wide">
          코드: {code}
        </span>
      )}

      {actions && (
        <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {actions}
        </div>
      )}
    </div>
  );
};
