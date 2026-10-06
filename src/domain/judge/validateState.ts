import type { PieceState, Problem, ResolvedPack } from "../types";

export type StateValidationResult =
  { ok: true } | { ok: false; code: "INVALID_STATE"; message?: string };

const cellKey = (r: number, c: number) => `${r},${c}`;

/**
 * 조각 상태 목록(pieces)이 문제 및 팩 정의의 불변식(9.3)을 만족하는지 검증한다.
 * 판정 엔진(evaluate), 저장 복원(restore), 리듀서에서 공통으로 재사용된다.
 */
export function validateState(
  pack: ResolvedPack,
  problem: Problem,
  pieces: PieceState[],
): StateValidationResult {
  const probPieces = problem.pieces;
  if (!pieces || pieces.length !== probPieces.length) {
    return { ok: false, code: "INVALID_STATE", message: "조각 수 불일치" };
  }

  const instMap = new Map(probPieces.map((p) => [p.id, p]));
  const initialMap = new Map(problem.initialPieces.map((p) => [p.instanceId, p]));
  const seenInstances = new Set<string>();
  const occupiedCells = new Set<string>();
  const blockedCells = new Set(problem.board.blockedCells.map((c) => cellKey(c.row, c.col)));

  for (const piece of pieces) {
    const inst = instMap.get(piece.instanceId);
    if (!inst || seenInstances.has(piece.instanceId)) {
      return { ok: false, code: "INVALID_STATE", message: "알 수 없거나 중복된 인스턴스 ID" };
    }
    seenInstances.add(piece.instanceId);

    const pieceType = pack.typeById[inst.typeId];
    if (!pieceType) {
      return { ok: false, code: "INVALID_STATE", message: "타입 정의 누락" };
    }

    if (!pieceType.allowedRotations.includes(piece.rotation)) {
      return { ok: false, code: "INVALID_STATE", message: "허용되지 않은 회전 각도" };
    }

    if (piece.location === "board") {
      const { row, col } = piece.cell;
      if (
        !Number.isInteger(row) ||
        !Number.isInteger(col) ||
        row < 0 ||
        row > 4 ||
        col < 0 ||
        col > 4
      ) {
        return { ok: false, code: "INVALID_STATE", message: "유효하지 않은 보드 좌표" };
      }

      const key = cellKey(row, col);
      if (occupiedCells.has(key)) {
        return { ok: false, code: "INVALID_STATE", message: "보드 셀 점유 중복" };
      }
      if (blockedCells.has(key)) {
        return { ok: false, code: "INVALID_STATE", message: "금지 셀에 조각 배치" };
      }
      occupiedCells.add(key);
    }

    // locked 조각 불변식: initialPieces와 정확히 일치해야 함
    if (inst.locked) {
      const initial = initialMap.get(piece.instanceId);
      if (!initial) {
        return { ok: false, code: "INVALID_STATE", message: "고정 조각의 초기 상태 누락" };
      }
      if (initial.location !== piece.location || initial.rotation !== piece.rotation) {
        return { ok: false, code: "INVALID_STATE", message: "고정 조각의 위치나 회전이 변경됨" };
      }
      if (initial.location === "board" && piece.location === "board") {
        if (initial.cell.row !== piece.cell.row || initial.cell.col !== piece.cell.col) {
          return { ok: false, code: "INVALID_STATE", message: "고정 조각의 좌표가 변경됨" };
        }
      }
    }
  }

  return { ok: true };
}
