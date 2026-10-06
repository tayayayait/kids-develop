import { useCallback, useEffect, useState } from "react";
import type { ResolvedPack } from "@/domain/types";
import { getProgressRepository } from "@/services/progress/createProgressRepository";
import type { ProgressRepository } from "@/services/progress/ProgressRepository";
import { restoreAttempt } from "@/services/progress/restoreAttempt";

export type ProblemProgressStatus = "not_started" | "in_progress" | "solved";

export interface ProgressSummary {
  isLoading: boolean;
  solvedCount: number;
  totalCount: number;
  lastProblemId: string | null;
  problemStatus: Record<string, ProblemProgressStatus>;
  isStorageUnavailable: boolean;
  refetch: () => void;
}

export function useProgressSummary(
  pack: ResolvedPack | null,
  injectedRepo?: ProgressRepository,
): ProgressSummary {
  const [summary, setSummary] = useState<ProgressSummary>({
    isLoading: true,
    solvedCount: 0,
    totalCount: pack ? pack.orderedProblems.length : 0,
    lastProblemId: null,
    problemStatus: {},
    isStorageUnavailable: false,
    refetch: () => {},
  });

  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let active = true;

    if (!pack) {
      setSummary((s) => ({
        ...s,
        isLoading: false,
        refetch,
      }));
      return;
    }

    const run = async () => {
      try {
        const repo = injectedRepo ?? (await getProgressRepository());
        if (!active) return;

        const [rawList, rawLastId] = await Promise.all([
          repo.listAttempts(pack.packId, pack.contentVersion),
          repo.getLastProblemId(pack.packId, pack.contentVersion),
        ]);

        if (!active) return;

        // problemId 기준 매핑
        const rawMap = new Map<string, unknown>();
        for (const raw of rawList) {
          if (raw && typeof raw === "object" && "problemId" in raw) {
            rawMap.set((raw as { problemId: string }).problemId, raw);
          }
        }

        const problemStatus: Record<string, ProblemProgressStatus> = {};
        let solvedCount = 0;

        for (const problem of pack.orderedProblems) {
          const raw = rawMap.get(problem.id);
          const restore = restoreAttempt(pack, problem, raw);

          if (restore.kind === "ok") {
            if (restore.everSolved) {
              problemStatus[problem.id] = "solved";
              solvedCount++;
            } else if (restore.boardRevision > 0) {
              problemStatus[problem.id] = "in_progress";
            } else {
              problemStatus[problem.id] = "not_started";
            }
          } else {
            problemStatus[problem.id] = "not_started";
          }
        }

        let validLastProblemId: string | null = null;
        if (rawLastId && pack.problemById[rawLastId]) {
          const lastRaw = rawMap.get(rawLastId);
          const lastRestore = restoreAttempt(pack, pack.problemById[rawLastId], lastRaw);
          if (lastRestore.kind === "ok" && lastRestore.boardRevision > 0) {
            validLastProblemId = rawLastId;
          }
        }

        setSummary({
          isLoading: false,
          solvedCount,
          totalCount: pack.orderedProblems.length,
          lastProblemId: validLastProblemId,
          problemStatus,
          isStorageUnavailable: repo.mode === "memory",
          refetch,
        });
      } catch (err) {
        console.warn("[useProgressSummary] failed to load progress:", err);
        if (!active) return;
        setSummary((s) => ({
          ...s,
          isLoading: false,
          refetch,
        }));
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [pack, injectedRepo, tick, refetch]);

  return {
    ...summary,
    refetch,
  };
}
