import type { PieceInstance, PieceState, Problem, ResolvedPack } from "../domain/types";
import type { PlayState } from "./playTypes";

export function selectCanEdit(state: PlayState): boolean {
  return (
    state.viewStatus === "ready" &&
    state.modal === "none" &&
    state.judgeStatus !== "checking" &&
    state.navigationStatus !== "loading"
  );
}

export function selectCanUseTools(state: PlayState): boolean {
  return selectCanEdit(state) && state.interaction === "idle" && state.selectedInstanceId !== null;
}

export function selectSelectedPiece(state: PlayState): PieceState | null {
  if (!state.selectedInstanceId) return null;
  return state.pieces.find((p) => p.instanceId === state.selectedInstanceId) || null;
}

export function selectCanRotate(state: PlayState, problem: Problem, pack: ResolvedPack): boolean {
  if (!selectCanUseTools(state) || !state.selectedInstanceId) return false;
  const inst = problem.pieces.find((p) => p.id === state.selectedInstanceId);
  if (!inst || inst.locked) return false;
  const pieceType = pack.typeById[inst.typeId];
  if (!pieceType) return false;
  return pieceType.allowedRotations.length > 1;
}

export function selectCanReturn(state: PlayState, problem: Problem): boolean {
  if (!selectCanUseTools(state) || !state.selectedInstanceId) return false;
  const inst = problem.pieces.find((p) => p.id === state.selectedInstanceId);
  if (!inst || inst.locked) return false;
  const piece = selectSelectedPiece(state);
  return piece?.location === "board";
}

export function selectPlacedMovableCount(state: PlayState, problem: Problem): number {
  const instMap = new Map(problem.pieces.map((p) => [p.id, p]));
  return state.pieces.filter((p) => {
    if (p.location !== "board") return false;
    const inst = instMap.get(p.instanceId);
    return inst && !inst.locked;
  }).length;
}

export function selectCanCheck(state: PlayState, problem: Problem): boolean {
  return (
    selectCanEdit(state) &&
    state.interaction === "idle" &&
    selectPlacedMovableCount(state, problem) > 0
  );
}

export function selectCanNext(state: PlayState): boolean {
  return (
    state.viewStatus === "ready" &&
    state.interaction === "idle" &&
    state.modal === "none" &&
    state.navigationStatus !== "loading" &&
    state.judgeStatus === "correct" &&
    state.checkedRevision === state.boardRevision
  );
}

export function selectCanNextInSuccessModal(state: PlayState): boolean {
  return (
    state.viewStatus === "ready" &&
    state.interaction === "idle" &&
    state.modal === "success" &&
    state.navigationStatus !== "loading" &&
    state.judgeStatus === "correct" &&
    state.checkedRevision === state.boardRevision
  );
}

export function selectTrayPieces(
  state: PlayState,
  problem: Problem,
): { instance: PieceInstance; state: Extract<PieceState, { location: "tray" }> }[] {
  const pieceStateMap = new Map(state.pieces.map((p) => [p.instanceId, p]));
  const result: { instance: PieceInstance; state: Extract<PieceState, { location: "tray" }> }[] =
    [];

  for (const inst of problem.pieces) {
    const s = pieceStateMap.get(inst.id);
    if (s && s.location === "tray") {
      result.push({ instance: inst, state: s });
    }
  }

  return result;
}
