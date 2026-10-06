import { describe, expect, it } from "vitest";
import { hitCell, resolveDrop } from "@/domain/layout/hitTest";

describe("hitCell (8.4 드롭 위치 산식 및 J17)", () => {
  // B = 324, padding/border 제외한 순수 격자 G = 296
  // C = (296 - 16) / 5 = 56, P = 56 + 4 = 60
  const grid = { left: 100, top: 100, width: 296, height: 296 };

  it("격자 좌상단 경계(100, 100)는 (0,0) 셀이다", () => {
    expect(hitCell(100, 100, grid)).toEqual({ row: 0, col: 0 });
  });

  it("격자 우하단 경계 직전은 (4,4) 셀이고 경계 이상은 null이다", () => {
    expect(hitCell(395, 395, grid)).toEqual({ row: 4, col: 4 });
    expect(hitCell(396, 396, grid)).toBeNull(); // 우하단 경계 제외
    expect(hitCell(99, 100, grid)).toBeNull(); // 좌측 바깥
    expect(hitCell(100, 99, grid)).toBeNull(); // 상단 바깥
  });

  it("J17: 4px gap의 앞쪽 절반은 앞 칸, 가운데(+2) 및 뒤쪽은 뒤 칸이다", () => {
    // 0번째 셀은 [100, 156), gap은 [156, 160)
    // 157: 앞 칸 (0)
    expect(hitCell(157, 100, grid)?.col).toBe(0);
    // 158: gap의 정확한 중심 (+2) -> 뒤 칸 (1)
    expect(hitCell(158, 100, grid)?.col).toBe(1);
    // 159: 뒤쪽 -> 뒤 칸 (1)
    expect(hitCell(159, 100, grid)?.col).toBe(1);
  });

  it("각 셀의 중심 좌표는 해당 (row, col)로 매핑된다", () => {
    // col 0: 100 + 28 = 128
    // col 1: 100 + 60 + 28 = 188
    // col 2: 100 + 120 + 28 = 248
    // col 3: 100 + 180 + 28 = 308
    // col 4: 100 + 240 + 28 = 368
    expect(hitCell(128, 128, grid)).toEqual({ row: 0, col: 0 });
    expect(hitCell(188, 248, grid)).toEqual({ row: 2, col: 1 });
    expect(hitCell(368, 368, grid)).toEqual({ row: 4, col: 4 });
  });
});

describe("resolveDrop", () => {
  const gridRect = { left: 100, top: 100, width: 296, height: 296 };
  const trayRect = { left: 100, top: 450, width: 296, height: 100 };

  it("보드 격자 내부 중심이면 kind: 'cell'을 반환한다", () => {
    const res = resolveDrop({ x: 128, y: 128 }, gridRect, trayRect);
    expect(res).toEqual({ kind: "cell", cell: { row: 0, col: 0 } });
  });

  it("조각함 영역 내부 중심이면 kind: 'tray'를 반환한다", () => {
    const res = resolveDrop({ x: 150, y: 480 }, gridRect, trayRect);
    expect(res).toEqual({ kind: "tray" });
  });

  it("보드와 조각함 모두의 바깥이면 kind: 'outside'를 반환한다", () => {
    const res = resolveDrop({ x: 50, y: 50 }, gridRect, trayRect);
    expect(res).toEqual({ kind: "outside" });
  });
});
