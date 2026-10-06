import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import devPackJson from "@/content/packs/engineering-demo.json";
import { validateContent } from "@/domain/content/validateContent";
import type { ResolvedPack } from "@/domain/types";
import { useProgressSummary } from "@/features/progress/useProgressSummary";
import { MemoryProgressRepository } from "@/services/progress/MemoryProgressRepository";

const validated = validateContent(devPackJson);
if (!validated.ok) throw new Error("pack invalid");
const pack: ResolvedPack = validated.pack;

describe("useProgressSummary", () => {
  it("기록이 없을 때 초기 요약 값을 올바르게 반환한다", async () => {
    const repo = new MemoryProgressRepository();
    const { result } = renderHook(() => useProgressSummary(pack, repo));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.solvedCount).toBe(0);
    expect(result.current.totalCount).toBe(pack.orderedProblems.length);
    expect(result.current.lastProblemId).toBeNull();
    expect(result.current.problemStatus["p-001"]).toBe("not_started");
  });

  it("진행 중인 문제와 완료된 문제가 올바르게 집계된다", async () => {
    const repo = new MemoryProgressRepository();

    // p-001: 완료
    await repo.putAttempt({
      schemaVersion: 1,
      packId: pack.packId,
      contentVersion: pack.contentVersion,
      problemId: "p-001",
      boardRevision: 3,
      pieces: pack.problemById["p-001"].initialPieces,
      everSolved: true,
      lastCheck: { status: "correct", revision: 3 },
      savedAt: new Date().toISOString(),
    });

    // p-002: 진행 중 (revision > 0)
    await repo.putAttempt({
      schemaVersion: 1,
      packId: pack.packId,
      contentVersion: pack.contentVersion,
      problemId: "p-002",
      boardRevision: 2,
      pieces: pack.problemById["p-002"].initialPieces,
      everSolved: false,
      lastCheck: null,
      savedAt: new Date().toISOString(),
    });

    const { result } = renderHook(() => useProgressSummary(pack, repo));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.solvedCount).toBe(1);
    expect(result.current.problemStatus["p-001"]).toBe("solved");
    expect(result.current.problemStatus["p-002"]).toBe("in_progress");
    expect(result.current.problemStatus["p-003"]).toBe("not_started");
    expect(result.current.lastProblemId).toBe("p-002");
  });
});
