import type { Cell } from "@/domain/types";

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
  size?: number;
}

export type DropResult = { kind: "cell"; cell: Cell } | { kind: "tray" } | { kind: "outside" };

/**
 * 8.4 드롭 위치 산식
 * 실제 격자 좌표 [Gx, Gx + G) x [Gy, Gy + G) 안에서 미리보기 중심 (cx, cy)가 속하는 셀을 계산한다.
 * 4px gap의 앞쪽 절반은 앞 칸, 정확한 중심(+2) 및 뒤쪽은 뒤 칸으로 매핑 (J17).
 */
export function hitCell(cx: number, cy: number, grid: RectLike): Cell | null {
  const G = grid.size ?? grid.width;
  if (cx < grid.left || cx >= grid.left + G || cy < grid.top || cy >= grid.top + G) {
    return null;
  }

  const C = (G - 16) / 5;
  const P = C + 4;

  const col = Math.min(4, Math.floor((cx - grid.left + 2) / P));
  const row = Math.min(4, Math.floor((cy - grid.top + 2) / P));

  return { row, col };
}

export function isPointInside(x: number, y: number, rect: RectLike): boolean {
  return (
    x >= rect.left && x <= rect.left + rect.width && y >= rect.top && y <= rect.top + rect.height
  );
}

/**
 * 미리보기 카드의 중심점을 기준으로 보드 격자, 조각함, 바깥을 판정한다.
 */
export function resolveDrop(
  center: { x: number; y: number },
  gridRect: RectLike | null | undefined,
  trayRect?: RectLike | null,
): DropResult {
  if (gridRect) {
    const cell = hitCell(center.x, center.y, gridRect);
    if (cell) {
      return { kind: "cell", cell };
    }
  }

  if (trayRect && isPointInside(center.x, center.y, trayRect)) {
    return { kind: "tray" };
  }

  return { kind: "outside" };
}
