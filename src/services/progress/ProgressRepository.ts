import type { PieceState } from "@/domain/types";

export interface SavedAttempt {
  schemaVersion: 1;
  packId: string;
  contentVersion: string;
  problemId: string;
  boardRevision: number;
  pieces: PieceState[];
  everSolved: boolean;
  lastCheck: null | {
    status: "correct" | "incorrect" | "incomplete";
    revision: number;
  };
  savedAt: string;
}

export interface ProgressRepository {
  readonly mode: "persistent" | "memory";
  getAttempt(packId: string, contentVersion: string, problemId: string): Promise<unknown | null>; // 검증 전 원시값
  listAttempts(packId: string, contentVersion: string): Promise<unknown[]>;
  getLastProblemId(packId: string, contentVersion: string): Promise<string | null>;
  putAttempt(a: SavedAttempt): Promise<void>; // attempts + meta(last) 같은 트랜잭션
  hasOtherVersion(packId: string, contentVersion: string, problemId: string): Promise<boolean>; // CONTENT_CHANGED 안내용
}
