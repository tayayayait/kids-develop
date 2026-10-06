import type { Problem, ResolvedPack } from "@/domain/types";
import { createProgressRepository } from "@/services/progress/createProgressRepository";
import { restoreAttempt, RestoreResult } from "@/services/progress/restoreAttempt";
import { contentRepository } from "./ContentRepository";

export interface PreparedProblem {
  pack: ResolvedPack;
  problem: Problem;
  restoreResult: RestoreResult;
}

export const preparedProblemCache = new Map<string, PreparedProblem>();

/**
 * 7.5 안전한 다음 문제 전환을 위해 문제 데이터를 미리 조회·검증·복원하는 함수
 */
export async function prepareProblem(problemId: string): Promise<PreparedProblem> {
  const pack = await contentRepository.getPack();
  if (!pack) throw new Error("PACK_NOT_FOUND");
  const problem = pack.problemById[problemId];
  if (!problem) throw new Error("PROBLEM_NOT_FOUND");

  const repo = await createProgressRepository();
  const rawAttempt = await repo.getAttempt(pack.packId, pack.contentVersion, problemId);
  const restoreResult = restoreAttempt(pack, problem, rawAttempt);

  return { pack, problem, restoreResult };
}
