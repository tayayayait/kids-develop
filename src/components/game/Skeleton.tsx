import React, { useEffect, useState } from "react";

/**
 * 300ms 미만의 빠른 로딩에서는 스켈레톤 깜빡임(flicker)을 방지하기 위한 지연 플래그 훅
 */
export function useDelayedFlag(delayMs = 300, active = true): boolean {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) {
      setShow(false);
      return;
    }
    const timer = setTimeout(() => {
      setShow(true);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);

  return show;
}

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  delay?: number;
  forceShow?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  delay = 0,
  forceShow = false,
  className = "",
  style,
  ...props
}) => {
  const shouldShowDelayed = useDelayedFlag(delay, delay > 0);
  const visible = forceShow || delay === 0 || shouldShowDelayed;

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-xl bg-[var(--disabled)] ${className}`.trim()}
      style={{ backgroundColor: "#E4E9E7", ...style }}
      {...props}
    />
  );
};
