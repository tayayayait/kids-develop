/**
 * 7.4 브라우저 필수 기능 지원 여부 검사
 * - Pointer Events (터치·마우스 통합)
 * - CSS Grid
 * - Inline SVG 네임스페이스
 */

export interface BrowserSupportResult {
  supported: boolean;
  unsupportedFeatures: string[];
}

export function checkBrowserSupport(): BrowserSupportResult {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { supported: true, unsupportedFeatures: [] };
  }

  const unsupported: string[] = [];

  // 1. PointerEvent 지원
  if (!("PointerEvent" in window)) {
    unsupported.push("PointerEvent");
  }

  // 2. CSS Grid 지원
  if (
    typeof CSS === "undefined" ||
    typeof CSS.supports !== "function" ||
    !CSS.supports("display", "grid")
  ) {
    unsupported.push("CSS Grid");
  }

  // 3. SVG DOM 생성 지원
  try {
    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    if (!svgEl || typeof svgEl.setAttribute !== "function") {
      unsupported.push("SVG");
    }
  } catch {
    unsupported.push("SVG");
  }

  return {
    supported: unsupported.length === 0,
    unsupportedFeatures: unsupported,
  };
}
