import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

describe("useResponsiveLayout", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      return setTimeout(() => cb(performance.now()), 0) as unknown as number;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("기본 렌더링 시 레이아웃 상태를 올바르게 계산한다", () => {
    Object.defineProperty(document.documentElement, "clientWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 768,
    });

    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current.mode).toBe("three-column");
    expect(result.current.B).toBe(480);
    expect(result.current.trayPageSize).toBe(8);
  });

  it("창 크기 resize 이벤트 발생 시 rAF 후 갱신된다", async () => {
    Object.defineProperty(document.documentElement, "clientWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 768,
    });

    const { result } = renderHook(() => useResponsiveLayout());
    expect(result.current.mode).toBe("three-column");

    // resize to 600x960
    act(() => {
      Object.defineProperty(document.documentElement, "clientWidth", {
        value: 600,
      });
      Object.defineProperty(window, "innerHeight", {
        value: 960,
      });
      window.dispatchEvent(new Event("resize"));
    });

    // wait for rAF / timer
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(result.current.mode).toBe("stacked");
    expect(result.current.B).toBe(336);
    expect(result.current.trayPageSize).toBe(4);
  });
});
