import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// jsdom 환경을 위한 PointerEvent 및 CSS.supports 기본값 정의
if (!("PointerEvent" in window)) {
  Object.defineProperty(window, "PointerEvent", {
    writable: true,
    value: class PointerEvent extends MouseEvent {},
  });
}

if (typeof CSS === "undefined" || !CSS.supports) {
  Object.defineProperty(window, "CSS", {
    writable: true,
    value: {
      supports: () => true,
    },
  });
}
