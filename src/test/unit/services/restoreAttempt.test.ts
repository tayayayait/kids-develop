import { describe, expect, it } from "vitest";
import devPackJson from "@/content/packs/engineering-demo.json";
import { validateContent } from "@/domain/content/validateContent";
import type { Problem, ResolvedPack } from "@/domain/types";
import { restoreAttempt } from "@/services/progress/restoreAttempt";

const validated = validateContent(devPackJson);
if (!validated.ok) throw new Error("pack invalid");
const pack: ResolvedPack = validated.pack;
const problem: Problem = pack.orderedProblems[0]; // p-001

describe("restoreAttempt", () => {
  it("기록이 없으면 kind: 'none'을 반환한다", () => {
    const res = restoreAttempt(pack, problem, null, false);
    expect(res.kind).toBe("none");
  });

  it("기록이 없고 다른 버전이 존재하면 kind: 'none'과 notice: 'CONTENT_CHANGED'를 반환한다", () => {
    const res = restoreAttempt(pack, problem, null, true);
    expect(res.kind).toBe("none");
    if (res.kind === "none") {
      expect(res.notice).toBe("CONTENT_CHANGED");
    }
  });

  it("정상적으로 저장된 미완료 배치를 ok로 복원한다", () => {
    const raw = {
      schemaVersion: 1,
      packId: pack.packId,
      contentVersion: pack.contentVersion,
      problemId: problem.id,
      boardRevision: 2,
      pieces: problem.initialPieces,
      everSolved: false,
      lastCheck: { status: "incorrect", revision: 1 },
      savedAt: new Date().toISOString(),
    };

    const res = restoreAttempt(pack, problem, raw);
    expect(res.kind).toBe("ok");
    if (res.kind === "ok") {
      expect(res.boardRevision).toBe(2);
      expect(res.judgeStatus).toBe("unchecked");
      expect(res.checkedRevision).toBeNull();
      expect(res.everSolved).toBe(false);
    }
  });

  it("T28: saved correct인 경우 현재 엔진으로 재판정 후 correct로 복원된다", () => {
    // p-001의 5개 조각을 정답 배치 (2,0~2,4 straight-blue rot 0)
    const solvedPieces = problem.pieces.map((p, idx) => ({
      instanceId: p.id,
      location: "board" as const,
      cell: { row: 2, col: idx },
      rotation: 0 as const,
    }));

    const raw = {
      schemaVersion: 1,
      packId: pack.packId,
      contentVersion: pack.contentVersion,
      problemId: problem.id,
      boardRevision: 5,
      pieces: solvedPieces,
      everSolved: true,
      lastCheck: { status: "correct", revision: 5 },
      savedAt: new Date().toISOString(),
    };

    const res = restoreAttempt(pack, problem, raw);
    expect(res.kind).toBe("ok");
    if (res.kind === "ok") {
      expect(res.judgeStatus).toBe("correct");
      expect(res.checkedRevision).toBe(5);
      expect(res.everSolved).toBe(true);
    }
  });

  it("saved correct라도 현재 엔진 재판정에서 오답이면 unchecked로 강등된다", () => {
    const raw = {
      schemaVersion: 1,
      packId: pack.packId,
      contentVersion: pack.contentVersion,
      problemId: problem.id,
      boardRevision: 1,
      pieces: problem.initialPieces, // 초기 배치는 오답
      everSolved: true,
      lastCheck: { status: "correct", revision: 1 }, // 기록에는 correct라고 거짓 기재됨
      savedAt: new Date().toISOString(),
    };

    const res = restoreAttempt(pack, problem, raw);
    expect(res.kind).toBe("ok");
    if (res.kind === "ok") {
      expect(res.judgeStatus).toBe("unchecked");
      expect(res.checkedRevision).toBeNull();
      expect(res.everSolved).toBe(true);
    }
  });

  it("T30: 스키마 버전 불일치나 손상된 데이터는 kind: 'invalid'를 반환한다", () => {
    const brokenSchema = {
      schemaVersion: 2, // 지원 안 함
      packId: pack.packId,
      contentVersion: pack.contentVersion,
      problemId: problem.id,
      boardRevision: 1,
      pieces: problem.initialPieces,
    };
    expect(restoreAttempt(pack, problem, brokenSchema).kind).toBe("invalid");

    // pieces 길이 불일치
    const brokenPieces = {
      schemaVersion: 1,
      packId: pack.packId,
      contentVersion: pack.contentVersion,
      problemId: problem.id,
      boardRevision: 1,
      pieces: [],
      savedAt: new Date().toISOString(),
    };
    expect(restoreAttempt(pack, problem, brokenPieces).kind).toBe("invalid");

    // 중복 셀 배치
    const dupCellPieces = problem.initialPieces.map((p) => ({
      ...p,
      location: "board" as const,
      cell: { row: 0, col: 0 },
    }));
    const brokenCoords = {
      schemaVersion: 1,
      packId: pack.packId,
      contentVersion: pack.contentVersion,
      problemId: problem.id,
      boardRevision: 1,
      pieces: dupCellPieces,
      savedAt: new Date().toISOString(),
    };
    expect(restoreAttempt(pack, problem, brokenCoords).kind).toBe("invalid");
  });
});
