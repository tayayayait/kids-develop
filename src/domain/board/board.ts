import type { Cell, PieceState, Problem, ResolvedPack, Rotation } from "../types";

export type MoveResult =
  | { ok: true; pieces: PieceState[]; changed: boolean }
  | {
      ok: false;
      code:
        "TARGET_OCCUPIED" | "TARGET_BLOCKED" | "FIXED_PIECE" | "OUTSIDE_BOARD" | "ROTATION_LOCKED";
    };

const cellKey = (r: number, c: number) => `${r},${c}`;

/**
 * 조각을 지정된 보드 칸(cell)에 배치한다.
 * 이미 해당 칸에 놓여있는 경우 changed: false 반환.
 * 오류 우선순위(16.2): 고정/금지 -> 점유 -> 경계
 */
export function placePiece(
  problem: Problem,
  pieces: PieceState[],
  instanceId: string,
  cell: Cell,
): MoveResult {
  const inst = problem.pieces.find((p) => p.id === instanceId);
  if (!inst) {
    return { ok: false, code: "FIXED_PIECE" };
  }
  if (inst.locked) {
    return { ok: false, code: "FIXED_PIECE" };
  }

  // 좌표 유효성
  if (
    !Number.isInteger(cell.row) ||
    !Number.isInteger(cell.col) ||
    cell.row < 0 ||
    cell.row > 4 ||
    cell.col < 0 ||
    cell.col > 4
  ) {
    return { ok: false, code: "OUTSIDE_BOARD" };
  }

  // 금지칸 여부
  const isBlocked = problem.board.blockedCells.some(
    (bc) => bc.row === cell.row && bc.col === cell.col,
  );
  if (isBlocked) {
    return { ok: false, code: "TARGET_BLOCKED" };
  }

  // 점유 여부 (다른 조각이 놓여있는지 확인)
  const current = pieces.find((p) => p.instanceId === instanceId);
  if (!current) {
    return { ok: false, code: "FIXED_PIECE" };
  }

  // 이미 그 칸에 놓여있는 경우 이동 없음
  if (
    current.location === "board" &&
    current.cell.row === cell.row &&
    current.cell.col === cell.col
  ) {
    return { ok: true, pieces, changed: false };
  }

  const occupied = pieces.some(
    (p) =>
      p.instanceId !== instanceId &&
      p.location === "board" &&
      p.cell.row === cell.row &&
      p.cell.col === cell.col,
  );
  if (occupied) {
    return { ok: false, code: "TARGET_OCCUPIED" };
  }

  const newPieces: PieceState[] = pieces.map((p) =>
    p.instanceId === instanceId
      ? {
          instanceId,
          location: "board" as const,
          cell: { row: cell.row, col: cell.col },
          rotation: p.rotation,
        }
      : p,
  );

  return { ok: true, pieces: newPieces, changed: true };
}

/**
 * 조각을 조각함(tray)으로 회수한다.
 * 이미 tray에 있는 경우 changed: false 반환.
 */
export function returnToTray(
  problem: Problem,
  pieces: PieceState[],
  instanceId: string,
): MoveResult {
  const inst = problem.pieces.find((p) => p.id === instanceId);
  if (!inst) {
    return { ok: false, code: "FIXED_PIECE" };
  }
  if (inst.locked) {
    return { ok: false, code: "FIXED_PIECE" };
  }

  const current = pieces.find((p) => p.instanceId === instanceId);
  if (!current) {
    return { ok: false, code: "FIXED_PIECE" };
  }

  if (current.location === "tray") {
    return { ok: true, pieces, changed: false };
  }

  const newPieces: PieceState[] = pieces.map((p) =>
    p.instanceId === instanceId
      ? { instanceId, location: "tray" as const, rotation: p.rotation }
      : p,
  );

  return { ok: true, pieces: newPieces, changed: true };
}

/**
 * 조각을 다음 허용 각도로 회전한다.
 * allowedRotations가 1개인 경우 ROTATION_LOCKED 오류 반환.
 */
export function rotatePiece(
  pack: ResolvedPack,
  problem: Problem,
  pieces: PieceState[],
  instanceId: string,
): MoveResult {
  const inst = problem.pieces.find((p) => p.id === instanceId);
  if (!inst) {
    return { ok: false, code: "FIXED_PIECE" };
  }
  if (inst.locked) {
    return { ok: false, code: "FIXED_PIECE" };
  }

  const pieceType = pack.typeById[inst.typeId];
  if (!pieceType) {
    return { ok: false, code: "FIXED_PIECE" };
  }

  const allowed = [...pieceType.allowedRotations].sort((a, b) => a - b);
  if (allowed.length <= 1) {
    return { ok: false, code: "ROTATION_LOCKED" };
  }

  const current = pieces.find((p) => p.instanceId === instanceId);
  if (!current) {
    return { ok: false, code: "FIXED_PIECE" };
  }

  const curIdx = allowed.indexOf(current.rotation);
  const nextRotation = curIdx === -1 ? allowed[0]! : allowed[(curIdx + 1) % allowed.length]!;

  const newPieces: PieceState[] = pieces.map((p) => {
    if (p.instanceId !== instanceId) return p;
    if (p.location === "board") {
      return { ...p, rotation: nextRotation };
    }
    return { ...p, rotation: nextRotation };
  });

  return { ok: true, pieces: newPieces, changed: true };
}

/**
 * 현재 pieces 배치가 문제의 initialPieces와 완전히 동일한 초기 상태인지 확인한다.
 */
export function isInitial(problem: Problem, pieces: PieceState[]): boolean {
  if (pieces.length !== problem.initialPieces.length) return false;
  const initialMap = new Map(problem.initialPieces.map((p) => [p.instanceId, p]));

  for (const p of pieces) {
    const init = initialMap.get(p.instanceId);
    if (!init) return false;
    if (init.location !== p.location) return false;
    if (init.rotation !== p.rotation) return false;
    if (init.location === "board" && p.location === "board") {
      if (init.cell.row !== p.cell.row || init.cell.col !== p.cell.col) {
        return false;
      }
    }
  }

  return true;
}
