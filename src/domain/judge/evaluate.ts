import type { JudgeResult, PieceState, Problem, ResolvedPack } from "../types";
import { evaluateConnection } from "./connection";
import { evaluateExact } from "./exact";
import { validateState } from "./validateState";

export { validateState } from "./validateState";

const cellKey = (r: number, c: number) => `${r},${c}`;

/**
 * 상태 및 문제 규칙 평가 순수 함수 (evaluate)
 * UI, 저장, React와 무관하게 순수 데이터(ResolvedPack, Problem, PieceState[], revision)를 입력받아
 * 9장의 상태 모델에 정의된 판정 결과를 반환한다.
 */
export function evaluate(
  pack: ResolvedPack,
  problem: Problem,
  pieces: PieceState[],
  revision: number,
): JudgeResult {
  const res = (status: JudgeResult["status"], code: string, debugReason?: string): JudgeResult => ({
    status,
    code,
    checkedRevision: revision,
    ...(debugReason ? { debugReason } : {}),
  });

  // 1. 불변식 및 상태 유효성 검증 (9.3)
  const stateCheck = validateState(pack, problem, pieces);
  if (!stateCheck.ok) {
    return res("system_error", "INVALID_STATE", stateCheck.message);
  }

  const instMap = new Map(problem.pieces.map((p) => [p.id, p]));
  const placed = pieces.filter(
    (p): p is Extract<PieceState, { location: "board" }> => p.location === "board",
  );
  const occ = new Map(placed.map((p) => [cellKey(p.cell.row, p.cell.col), p]));
  const req = problem.requirements;

  // 2. Requirements 검사 순서 (10.1-2: incorrect 조건 우선 검사 후 incomplete 검사)
  // ① placed > maxPlaced
  if (placed.length > req.maxPlaced) {
    return res("incorrect", "TOO_MANY");
  }

  // ② emptyCells 점유
  if (req.emptyCells.some((c) => occ.has(cellKey(c.row, c.col)))) {
    return res("incorrect", "EMPTY_CELL_USED");
  }

  // 조각 judgeKey별 배치 수 계산
  const counts: Record<string, number> = {};
  for (const p of placed) {
    const inst = instMap.get(p.instanceId);
    if (!inst) continue;
    const pieceType = pack.typeById[inst.typeId];
    if (!pieceType) continue;
    counts[pieceType.judgeKey] = (counts[pieceType.judgeKey] ?? 0) + 1;
  }

  // ③ 타입별 count 초과
  if (req.requiredTypeCounts.some((t) => (counts[t.judgeKey] ?? 0) > t.count)) {
    return res("incorrect", "TOO_MANY_TYPE");
  }

  // ④-A placed < minPlaced
  if (placed.length < req.minPlaced) {
    return res("incomplete", "MISSING_REQUIRED");
  }

  // ④-B requireAllMovablePieces 미달
  const movableCount = problem.pieces.filter((p) => !p.locked).length;
  const placedMovableCount = placed.filter((p) => {
    const inst = instMap.get(p.instanceId);
    return inst && !inst.locked;
  }).length;
  if (req.requireAllMovablePieces && placedMovableCount < movableCount) {
    return res("incomplete", "MISSING_REQUIRED");
  }

  // ④-C 타입별 count 미달
  if (req.requiredTypeCounts.some((t) => (counts[t.judgeKey] ?? 0) < t.count)) {
    return res("incomplete", "MISSING_REQUIRED");
  }

  // ⑤ requiredCells 미점유
  if (req.requiredCells.some((c) => !occ.has(cellKey(c.row, c.col)))) {
    return res("incomplete", "REQUIRED_CELL_EMPTY");
  }

  // 3. 판정 모드별 평가
  if (problem.judge.mode === "exact") {
    return evaluateExact(pack, problem, placed, revision);
  }

  if (problem.judge.mode === "connection") {
    return evaluateConnection(pack, problem, placed, revision);
  }

  return res("system_error", "UNSUPPORTED_RULE");
}
