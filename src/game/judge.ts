import { resolvedPack } from "./content";
import type { JudgeResult, PieceState, Problem, Side } from "./types";
import {
  evaluate as evaluateDomain,
  validateState as validateDomainState,
} from "@/domain/judge/evaluate";
import { rotateSide } from "@/domain/judge/rotation";
import type { PieceState as DomainPieceState, Problem as DomainProblem } from "@/domain/types";

export { rotateSide };

export function validateState(problem: Problem, pieces: PieceState[]): boolean {
  const res = validateDomainState(
    resolvedPack,
    problem as unknown as DomainProblem,
    pieces as unknown as DomainPieceState[],
  );
  return res.ok;
}

export function evaluate(problem: Problem, pieces: PieceState[], revision: number): JudgeResult {
  return evaluateDomain(
    resolvedPack,
    problem as unknown as DomainProblem,
    pieces as unknown as DomainPieceState[],
    revision,
  ) as unknown as JudgeResult;
}
