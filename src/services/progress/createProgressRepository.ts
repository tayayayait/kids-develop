import { IndexedDbProgressRepository } from "./IndexedDbProgressRepository";
import { MemoryProgressRepository } from "./MemoryProgressRepository";
import type { ProgressRepository } from "./ProgressRepository";

interface CreateOptions {
  dbName?: string;
  timeoutMs?: number;
}

export async function createProgressRepository(
  options: CreateOptions = {},
): Promise<ProgressRepository> {
  const { dbName = "cognitive-board", timeoutMs = 2000 } = options;

  if (typeof indexedDB === "undefined") {
    return new MemoryProgressRepository();
  }

  try {
    const candidate = new IndexedDbProgressRepository(dbName);
    // 2초 타임아웃 내에 getAttempt 테스트가 성공하는지 확인
    const checkPromise = candidate.getAttempt("__test__", "0.0.0", "__probe__");
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("IndexedDB check timed out")), timeoutMs);
    });

    await Promise.race([checkPromise, timeoutPromise]);
    return candidate;
  } catch (err) {
    console.warn(
      "[createProgressRepository] IndexedDB is not usable, falling back to memory repository:",
      err,
    );
    return new MemoryProgressRepository();
  }
}

// 애플리케이션 전역 싱글턴 인스턴스 (비동기 초기화 래퍼)
let repoPromise: Promise<ProgressRepository> | null = null;

export function getProgressRepository(): Promise<ProgressRepository> {
  if (!repoPromise) {
    repoPromise = createProgressRepository();
  }
  return repoPromise;
}
