import type { Cell } from "@/domain/types";

/**
 * 15.2 키보드 격자 탐색 순수 함수
 * - Arrow: 0..4 경계 내에서 1칸 이동
 * - Home/End: 현재 행의 0열 / 4열로 이동
 * - Ctrl + Home/End: (0,0) / (4,4)로 이동
 */
export function nextFocus(cell: Cell, key: string, ctrlKey = false): Cell {
  switch (key) {
    case "ArrowUp":
      return { row: Math.max(0, cell.row - 1), col: cell.col };
    case "ArrowDown":
      return { row: Math.min(4, cell.row + 1), col: cell.col };
    case "ArrowLeft":
      return { row: cell.row, col: Math.max(0, cell.col - 1) };
    case "ArrowRight":
      return { row: cell.row, col: Math.min(4, cell.col + 1) };
    case "Home":
      return ctrlKey ? { row: 0, col: 0 } : { row: cell.row, col: 0 };
    case "End":
      return ctrlKey ? { row: 4, col: 4 } : { row: cell.row, col: 4 };
    default:
      return cell;
  }
}
