import { AlertTriangle, Ban, Check, Info } from "lucide-react";
import React from "react";

export type FeedbackTone = "success" | "warning" | "error" | "info";

export interface InlineFeedbackProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: FeedbackTone;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const InlineFeedback: React.FC<InlineFeedbackProps> = ({
  tone = "info",
  icon,
  children,
  className = "",
  ...props
}) => {
  const toneConfig = {
    success: {
      bg: "bg-[var(--success-bg)]",
      text: "text-[var(--success)]",
      border: "border-[var(--success)]/30",
      defaultIcon: <Check className="w-6 h-6 shrink-0" aria-hidden="true" />,
    },
    warning: {
      bg: "bg-[var(--warning-bg)]",
      text: "text-[var(--warning)]",
      border: "border-[var(--warning)]/30",
      defaultIcon: <AlertTriangle className="w-6 h-6 shrink-0" aria-hidden="true" />,
    },
    error: {
      bg: "bg-[var(--error-bg)]",
      text: "text-[var(--error)]",
      border: "border-[var(--error)]/30",
      defaultIcon: <Ban className="w-6 h-6 shrink-0" aria-hidden="true" />,
    },
    info: {
      bg: "bg-[var(--info-bg)]",
      text: "text-[var(--info)]",
      border: "border-[var(--info)]/30",
      defaultIcon: <Info className="w-6 h-6 shrink-0" aria-hidden="true" />,
    },
  }[tone];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`min-h-[56px] p-3 flex items-center gap-2 rounded-xl border text-[1.125rem] leading-[1.556] font-medium transition-all duration-120 ${toneConfig.bg} ${toneConfig.text} ${toneConfig.border} ${className}`.trim()}
      {...props}
    >
      <span className="shrink-0 flex items-center justify-center">
        {icon ?? toneConfig.defaultIcon}
      </span>
      <span className="flex-1">{children}</span>
    </div>
  );
};
