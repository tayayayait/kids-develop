/**
 * 상세서 6.1 ~ 6.3 레이아웃과 뷰포트 반응형 산식 (순수 함수)
 */

export type LayoutMode = "three-column" | "stacked" | "narrow";

export interface LayoutResult {
  /** 화면 외곽 여백 (px) - W < 840 ? 16 : 24 */
  M: number;
  /** 컨테이너 가로 폭 (px) - min(W - 2M, 1280) */
  L: number;
  /** 레이아웃 모드: W >= 1024 3열, W >= 600 세로 쌓기, W < 600 좁은 화면 */
  mode: LayoutMode;
  /** 보드 외곽 너비·높이 (px) - [324, 480] 범위 클램프 */
  B: number;
  /** 셀 너비·높이 (px) - (B - 44) / 5 */
  C: number;
  /** 3열 워크스페이스 높이 (px) - max(392, H - 192) */
  A: number;
  /** 3열 조각함 행 수 (1..4) */
  trayRows: number;
  /** 조각함 1페이지당 카드 수 */
  trayPageSize: number;
  /** 컨테이너보다 보드가 커서 가로 스크롤이 필요한지 여부 (L < B) */
  boardScroll: boolean;
}

/**
 * 뷰포트 너비 W와 높이 H (safe-area 차감 후), 그리고 세로 모드 도안 요약 높이를 받아
 * 보드 크기, 워크스페이스 구조, 조각함 페이지 크기를 계산합니다.
 */
export function computeLayout(W: number, H: number, patternPanelHeight = 112): LayoutResult {
  const M = W < 840 ? 16 : 24;
  const L = Math.min(W - 2 * M, 1280);
  const mode: LayoutMode = W >= 1024 ? "three-column" : W >= 600 ? "stacked" : "narrow";

  let B: number;
  if (mode === "three-column") {
    // 가운데 열 너비 R = L - 472
    const R = L - 472;
    // B = max(324, min(480, R, H - 260))
    B = Math.max(324, Math.min(480, R, H - 260));
  } else {
    // 세로 쌓기: 글자 확대 등으로 도안이 112px보다 높아지면 추가 높이 차감
    const patternExtra = Math.max(0, patternPanelHeight - 112);
    // B = max(324, min(480, L, H - 624 - patternExtra))
    B = Math.max(324, Math.min(480, L, H - 624 - patternExtra));
  }

  const C = (B - 44) / 5;
  const A = Math.max(392, H - 192);
  const trayRows = Math.min(4, Math.max(1, Math.floor((A - 108) / 96)));

  const trayPageSize =
    mode === "three-column" ? 2 * trayRows : Math.max(1, Math.floor((L - 156) / 88));

  return {
    M,
    L,
    mode,
    B,
    C,
    A,
    trayRows,
    trayPageSize,
    boardScroll: L < B,
  };
}
