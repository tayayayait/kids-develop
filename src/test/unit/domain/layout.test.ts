import { describe, expect, it } from "vitest";
import { computeLayout } from "@/domain/layout/layout";

describe("computeLayout (상세서 6.3 뷰포트 레이아웃 산식)", () => {
  it("600×960 (소형 태블릿 세로) - L=568, stacked, B=336, C=58.4, trayPageSize=4", () => {
    const layout = computeLayout(600, 960);
    expect(layout.M).toBe(16);
    expect(layout.L).toBe(568);
    expect(layout.mode).toBe("stacked");
    expect(layout.B).toBe(336);
    expect(Number(layout.C.toFixed(1))).toBe(58.4);
    expect(layout.trayPageSize).toBe(4);
    expect(layout.boardScroll).toBe(false);
  });

  it("768×1024 (태블릿 세로) - L=736, stacked, B=400, C=71.2, trayPageSize=6", () => {
    const layout = computeLayout(768, 1024);
    expect(layout.M).toBe(16);
    expect(layout.L).toBe(736);
    expect(layout.mode).toBe("stacked");
    expect(layout.B).toBe(400);
    expect(Number(layout.C.toFixed(1))).toBe(71.2);
    expect(layout.trayPageSize).toBe(6);
    expect(layout.boardScroll).toBe(false);
  });

  it("820×1180 (태블릿 세로 넓음) - L=788, stacked, B=480, C=87.2, trayPageSize=7", () => {
    const layout = computeLayout(820, 1180);
    expect(layout.M).toBe(16);
    expect(layout.L).toBe(788);
    expect(layout.mode).toBe("stacked");
    expect(layout.B).toBe(480);
    expect(Number(layout.C.toFixed(1))).toBe(87.2);
    expect(layout.trayPageSize).toBe(7);
    expect(layout.boardScroll).toBe(false);
  });

  it("1024×768 (태블릿 가로 기본) - L=976, three-column, B=480, C=87.2, trayPageSize=8, trayRows=4", () => {
    const layout = computeLayout(1024, 768);
    expect(layout.M).toBe(24);
    expect(layout.L).toBe(976);
    expect(layout.mode).toBe("three-column");
    expect(layout.B).toBe(480);
    expect(Number(layout.C.toFixed(1))).toBe(87.2);
    expect(layout.A).toBe(576); // 768 - 192
    expect(layout.trayRows).toBe(4);
    expect(layout.trayPageSize).toBe(8); // 2 * 4
    expect(layout.boardScroll).toBe(false);
  });

  it("1024×600 (태블릿 가로 낮은 높이) - L=976, three-column, B=340, C=59.2, trayPageSize=6, trayRows=3", () => {
    const layout = computeLayout(1024, 600);
    expect(layout.M).toBe(24);
    expect(layout.L).toBe(976);
    expect(layout.mode).toBe("three-column");
    expect(layout.B).toBe(340);
    expect(Number(layout.C.toFixed(1))).toBe(59.2);
    expect(layout.A).toBe(408); // 600 - 192
    expect(layout.trayRows).toBe(3);
    expect(layout.trayPageSize).toBe(6); // 2 * 3
    expect(layout.boardScroll).toBe(false);
  });

  it("1180×820 (태블릿 가로 대형) - L=1132, three-column, B=480, C=87.2, trayPageSize=8", () => {
    const layout = computeLayout(1180, 820);
    expect(layout.M).toBe(24);
    expect(layout.L).toBe(1132);
    expect(layout.mode).toBe("three-column");
    expect(layout.B).toBe(480);
    expect(Number(layout.C.toFixed(1))).toBe(87.2);
    expect(layout.trayPageSize).toBe(8);
  });

  it("1366×1024 (데스크톱/대형 패드) - L=1280 (최대제한), three-column, B=480, C=87.2, trayPageSize=8", () => {
    const layout = computeLayout(1366, 1024);
    expect(layout.M).toBe(24);
    expect(layout.L).toBe(1280);
    expect(layout.mode).toBe("three-column");
    expect(layout.B).toBe(480);
    expect(Number(layout.C.toFixed(1))).toBe(87.2);
    expect(layout.trayPageSize).toBe(8);
  });

  it("W < 600 (좁은 화면/축소 모드) - narrow 모드 및 L < B 시 boardScroll 플래그", () => {
    const layout = computeLayout(320, 640);
    expect(layout.mode).toBe("narrow");
    expect(layout.B).toBe(324); // 최소 B는 324 유지
    expect(layout.boardScroll).toBe(true); // L=288 < B=324
  });

  it("세로 모드에서 도안 요약 높이가 112px 초과 시 B 감소 보정", () => {
    // 768×1024에서 기본 B=400 (H - 624 = 400). 만약 도안 요약이 162px (+50px)이면 B는 350으로 감소
    const layout = computeLayout(768, 1024, 162);
    expect(layout.B).toBe(350);
  });
});
