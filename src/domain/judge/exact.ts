import type { ExactJudge, JudgeResult, PieceState, Problem, ResolvedPack } from "../types";
import { normalizeRotation } from "./rotation";

/**
 * Exact 판정 모드 평가
 * 보드의 조각 배치를 행 우선 25칸 배열로 표현하고, solutions 중 하나와 정확히 일치하는지 비교한다.
 */
export function evaluateExact(
  pack: ResolvedPack,
  problem: Problem,
  placed: Extract<PieceState, { location: "board" }>[],
  revision: number,
): JudgeResult {
  const judge = problem.judge as ExactJudge;
  if (!judge.solutions || judge.solutions.length === 0) {
    return {
      status: "system_error",
      code: "UNSUPPORTED_RULE",
      checkedRevision: revision,
    };
  }

  const instMap = new Map(problem.pieces.map((p) => [p.id, p]));

  // 현재 보드 상태를 25칸 배열로 매핑
  const currentBoard: ({ judgeKey: string; rotation: number } | null)[] = Array.from(
    { length: 25 },
    () => null,
  );

  for (const p of placed) {
    const inst = instMap.get(p.instanceId);
    if (!inst) continue;
    const pieceType = pack.typeById[inst.typeId];
    if (!pieceType) continue;

    const idx = p.cell.row * 5 + p.cell.col;
    let normRot: number;
    try {
      normRot = normalizeRotation(pieceType, p.rotation);
    } catch {
      return {
        status: "system_error",
        code: "UNSUPPORTED_RULE",
        checkedRevision: revision,
      };
    }
    currentBoard[idx] = {
      judgeKey: pieceType.judgeKey,
      rotation: normRot,
    };
  }

  // 각 solution과 비교
  for (const sol of judge.solutions) {
    if (!sol || sol.length !== 25) continue;

    let matched = true;
    for (let i = 0; i < 25; i++) {
      const cur = currentBoard[i];
      const target = sol[i];

      if (target === null) {
        if (cur !== null) {
          matched = false;
          break;
        }
      } else {
        if (cur === null) {
          matched = false;
          break;
        }
        if (cur.judgeKey !== target.judgeKey) {
          matched = false;
          break;
        }
        // target의 rotation도 등가 회전 정규화 적용
        // target의 judgeKey에 해당하는 타입의 회전 규격 조회
        const sampleType = Object.values(pack.typeById).find((t) => t.judgeKey === target.judgeKey);
        let targetNormRot = target.rotation;
        if (sampleType) {
          try {
            targetNormRot = normalizeRotation(sampleType, target.rotation);
          } catch {
            // 정규화 실패 시 원본 비교
          }
        }
        if (cur.rotation !== targetNormRot) {
          matched = false;
          break;
        }
      }
    }

    if (matched) {
      return {
        status: "correct",
        code: "ALL_RULES_MET",
        checkedRevision: revision,
      };
    }
  }

  return {
    status: "incorrect",
    code: "RULE_NOT_MET",
    checkedRevision: revision,
  };
}
