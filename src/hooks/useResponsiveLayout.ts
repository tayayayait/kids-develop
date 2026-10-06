import { useEffect, useRef, useState } from "react";
import { computeLayout, LayoutResult } from "@/domain/layout/layout";

export interface ResponsiveLayoutState extends LayoutResult {
  /** 안전 영역을 제외한 측정 뷰포트 너비 */
  viewportW: number;
  /** 안전 영역을 제외한 측정 뷰포트 높이 */
  viewportH: number;
}

const DEFAULT_LAYOUT: ResponsiveLayoutState = {
  ...computeLayout(768, 1024),
  viewportW: 768,
  viewportH: 1024,
};

function parsePixelValue(val: string | undefined): number {
  if (!val) return 0;
  const num = parseFloat(val);
  return Number.isFinite(num) ? num : 0;
}

function readSafeAreaInsets(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }
  const style = getComputedStyle(document.documentElement);
  return {
    top: parsePixelValue(style.getPropertyValue("--sa-top")),
    bottom: parsePixelValue(style.getPropertyValue("--sa-bottom")),
    left: parsePixelValue(style.getPropertyValue("--sa-left")),
    right: parsePixelValue(style.getPropertyValue("--sa-right")),
  };
}

/**
 * 뷰포트 너비·높이와 safe-area, 도안 요약 높이를 실시간 측정하여
 * 상세서 6장 레이아웃 산식 결과를 반환하는 훅
 */
export function useResponsiveLayout(patternPanelHeight = 112): ResponsiveLayoutState {
  const [layoutState, setLayoutState] = useState<ResponsiveLayoutState>(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return DEFAULT_LAYOUT;
    }
    const safe = readSafeAreaInsets();
    const W = Math.max(320, document.documentElement.clientWidth - safe.left - safe.right);
    const rawH = window.visualViewport?.height ?? window.innerHeight;
    const H = Math.max(480, rawH - safe.top - safe.bottom);
    return {
      ...computeLayout(W, H, patternPanelHeight),
      viewportW: W,
      viewportH: H,
    };
  });

  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const measure = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const safe = readSafeAreaInsets();
        const W = Math.max(320, document.documentElement.clientWidth - safe.left - safe.right);
        const rawH = window.visualViewport?.height ?? window.innerHeight;
        const H = Math.max(480, rawH - safe.top - safe.bottom);
        const next = computeLayout(W, H, patternPanelHeight);

        setLayoutState((prev) => {
          if (
            prev.B === next.B &&
            prev.mode === next.mode &&
            prev.L === next.L &&
            prev.trayPageSize === next.trayPageSize &&
            prev.trayRows === next.trayRows &&
            prev.viewportW === W &&
            prev.viewportH === H
          ) {
            return prev;
          }
          return {
            ...next,
            viewportW: W,
            viewportH: H,
          };
        });
      });
    };

    // 초기 측정 즉시 갱신
    measure();

    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("orientationchange", measure, { passive: true });

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", measure, { passive: true });
    }

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && document.body) {
      ro = new ResizeObserver(() => measure());
      ro.observe(document.body);
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      if (vv) {
        vv.removeEventListener("resize", measure);
      }
      ro?.disconnect();
    };
  }, [patternPanelHeight]);

  return layoutState;
}
