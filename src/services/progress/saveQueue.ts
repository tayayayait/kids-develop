import type { PieceState } from "@/domain/types";
import type { ProgressRepository, SavedAttempt } from "./ProgressRepository";

export interface AttemptSnapshot {
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
}

export type SaveQueueStatus = "idle" | "saving" | "saved" | "error";

export interface SaveQueueOptions {
  debounceMs?: number;
  maxWaitMs?: number;
  onStatus?: (status: SaveQueueStatus) => void;
}

export interface SaveQueue {
  schedule(snapshot: AttemptSnapshot): void;
  now(snapshot: AttemptSnapshot): void;
  flush(timeoutMs?: number): Promise<"saved" | "timeout" | "error" | "idle">;
  flushBestEffort(): void;
  dispose(): void;
}

export function createSaveQueue(
  repo: ProgressRepository,
  options: SaveQueueOptions = {},
): SaveQueue {
  const { debounceMs = 250, maxWaitMs = 1000, onStatus } = options;

  let isWriting = false;
  let pendingSnapshot: AttemptSnapshot | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let firstScheduleTime: number | null = null;
  let lastWritePromise: Promise<boolean> | null = null;

  const notify = (status: SaveQueueStatus) => {
    onStatus?.(status);
  };

  const clearTimer = () => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  };

  const toSavedAttempt = (snap: AttemptSnapshot): SavedAttempt => ({
    schemaVersion: 1,
    packId: snap.packId,
    contentVersion: snap.contentVersion,
    problemId: snap.problemId,
    boardRevision: snap.boardRevision,
    pieces: snap.pieces,
    everSolved: snap.everSolved,
    lastCheck: snap.lastCheck,
    savedAt: new Date().toISOString(),
  });

  const executeSave = async (): Promise<boolean> => {
    clearTimer();
    firstScheduleTime = null;

    if (!pendingSnapshot) {
      notify("idle");
      return true;
    }

    if (isWriting) {
      // 이미 다른 쓰기가 진행 중이면 끝나길 기다렸다가 재시도
      return lastWritePromise?.then(() => executeSave()).catch(() => executeSave()) ?? false;
    }

    const currentToSave = pendingSnapshot;
    pendingSnapshot = null;
    isWriting = true;
    notify("saving");

    const writePromise = (async () => {
      try {
        await repo.putAttempt(toSavedAttempt(currentToSave));
        notify("saved");
        return true;
      } catch (err) {
        console.warn("[SaveQueue] Failed to save attempt:", err);
        notify("error");
        return false;
      } finally {
        isWriting = false;
        // 쓰는 도중 또 새로운 스냅샷이 쌓였다면 연이어 저장
        if (pendingSnapshot) {
          queueMicrotask(() => {
            void executeSave();
          });
        }
      }
    })();

    lastWritePromise = writePromise;
    return writePromise;
  };

  const schedule = (snapshot: AttemptSnapshot) => {
    pendingSnapshot = snapshot;
    const nowTime = Date.now();

    if (firstScheduleTime === null) {
      firstScheduleTime = nowTime;
    }

    clearTimer();

    // maxWaitMs 경과 확인
    if (nowTime - firstScheduleTime >= maxWaitMs) {
      void executeSave();
    } else {
      const remainingMaxWait = maxWaitMs - (nowTime - firstScheduleTime);
      const delay = Math.min(debounceMs, remainingMaxWait);
      debounceTimer = setTimeout(() => {
        void executeSave();
      }, delay);
    }
  };

  const now = (snapshot: AttemptSnapshot) => {
    pendingSnapshot = snapshot;
    void executeSave();
  };

  const flush = async (timeoutMs = 500): Promise<"saved" | "timeout" | "error" | "idle"> => {
    clearTimer();
    firstScheduleTime = null;

    if (!pendingSnapshot && !isWriting) {
      return "idle";
    }

    let timedOut = false;
    const timeoutPromise = new Promise<"timeout">((resolve) => {
      setTimeout(() => {
        timedOut = true;
        resolve("timeout");
      }, timeoutMs);
    });

    const savePromise = (async () => {
      const ok = await executeSave();
      return ok ? ("saved" as const) : ("error" as const);
    })();

    const result = await Promise.race([savePromise, timeoutPromise]);
    if (timedOut) {
      return "timeout";
    }
    return result;
  };

  const flushBestEffort = () => {
    clearTimer();
    firstScheduleTime = null;
    if (pendingSnapshot) {
      void executeSave();
    }
  };

  const dispose = () => {
    clearTimer();
    firstScheduleTime = null;
    pendingSnapshot = null;
  };

  return {
    schedule,
    now,
    flush,
    flushBestEffort,
    dispose,
  };
}
