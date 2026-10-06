import { z } from "zod";
import { evaluate } from "@/domain/judge/evaluate";
import { validateState } from "@/domain/judge/validateState";
import type { PieceState, Problem, ResolvedPack } from "@/domain/types";

export type RestoreResult =
  | { kind: "none"; notice?: "CONTENT_CHANGED" }
  | {
      kind: "ok";
      pieces: PieceState[];
      boardRevision: number;
      everSolved: boolean;
      judgeStatus: "unchecked" | "correct";
      checkedRevision: number | null;
    }
  | { kind: "invalid" };

const cellSchema = z.object({
  row: z.number().int().min(0).max(4),
  col: z.number().int().min(0).max(4),
});

const rotationSchema = z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]);

const pieceStateSchema = z.discriminatedUnion("location", [
  z.object({
    instanceId: z.string(),
    location: z.literal("tray"),
    rotation: rotationSchema,
  }),
  z.object({
    instanceId: z.string(),
    location: z.literal("board"),
    cell: cellSchema,
    rotation: rotationSchema,
  }),
]);

const savedAttemptSchema = z.object({
  schemaVersion: z.literal(1),
  packId: z.string(),
  contentVersion: z.string(),
  problemId: z.string(),
  boardRevision: z.number().int().min(0),
  pieces: z.array(pieceStateSchema),
  everSolved: z.boolean(),
  lastCheck: z
    .object({
      status: z.enum(["correct", "incorrect", "incomplete"]),
      revision: z.number().int().min(0),
    })
    .nullable(),
  savedAt: z.string(),
});

export function restoreAttempt(
  pack: ResolvedPack,
  problem: Problem,
  raw: unknown,
  hasOtherVersion = false,
): RestoreResult {
  if (raw === null || raw === undefined) {
    if (hasOtherVersion) {
      return { kind: "none", notice: "CONTENT_CHANGED" };
    }
    return { kind: "none" };
  }

  const parseResult = savedAttemptSchema.safeParse(raw);
  if (!parseResult.success) {
    return { kind: "invalid" };
  }

  const attempt = parseResult.data;

  // 팩 및 문제 식별자 일치 검증
  if (
    attempt.packId !== pack.packId ||
    attempt.contentVersion !== pack.contentVersion ||
    attempt.problemId !== problem.id
  ) {
    return { kind: "invalid" };
  }

  // 불변식 검증 (locked 위치 보존, 셀 범위 및 중복 점유 등)
  const stateCheck = validateState(pack, problem, attempt.pieces as PieceState[]);
  if (!stateCheck.ok) {
    return { kind: "invalid" };
  }

  // 판정 재실행 검증
  let judgeStatus: "unchecked" | "correct" = "unchecked";
  let checkedRevision: number | null = null;

  if (
    attempt.lastCheck?.status === "correct" &&
    attempt.lastCheck.revision === attempt.boardRevision
  ) {
    const judgeRes = evaluate(pack, problem, attempt.pieces as PieceState[], attempt.boardRevision);
    if (judgeRes.status === "correct") {
      judgeStatus = "correct";
      checkedRevision = attempt.boardRevision;
    }
  }

  return {
    kind: "ok",
    pieces: attempt.pieces as PieceState[],
    boardRevision: attempt.boardRevision,
    everSolved: attempt.everSolved,
    judgeStatus,
    checkedRevision,
  };
}
