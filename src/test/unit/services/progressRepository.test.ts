import "fake-indexeddb/auto";
import { describe, expect, it, afterEach, beforeEach } from "vitest";
import type { SavedAttempt } from "@/services/progress/ProgressRepository";
import { IndexedDbProgressRepository } from "@/services/progress/IndexedDbProgressRepository";
import { MemoryProgressRepository } from "@/services/progress/MemoryProgressRepository";
import { createProgressRepository } from "@/services/progress/createProgressRepository";

const sampleAttempt: SavedAttempt = {
  schemaVersion: 1,
  packId: "demo-pack",
  contentVersion: "1.0.0",
  problemId: "p-001",
  boardRevision: 3,
  pieces: [{ instanceId: "p1", location: "board", cell: { row: 0, col: 0 }, rotation: 0 }],
  everSolved: false,
  lastCheck: { status: "incorrect", revision: 2 },
  savedAt: new Date().toISOString(),
};

describe("IndexedDbProgressRepository", () => {
  let repo: IndexedDbProgressRepository;
  let dbName: string;

  beforeEach(() => {
    dbName = `cognitive-board-${Math.random().toString(36).slice(2)}`;
    repo = new IndexedDbProgressRepository(dbName);
  });

  afterEach(async () => {
    await repo.close();
  });

  it("mode는 persistent이다", () => {
    expect(repo.mode).toBe("persistent");
  });

  it("putAttempt 후 getAttempt로 원시 데이터를 조회할 수 있다", async () => {
    await repo.putAttempt(sampleAttempt);
    const loaded = (await repo.getAttempt("demo-pack", "1.0.0", "p-001")) as SavedAttempt;
    expect(loaded).toBeDefined();
    expect(loaded.problemId).toBe("p-001");
    expect(loaded.boardRevision).toBe(3);
    expect(loaded.pieces).toHaveLength(1);
  });

  it("존재하지 않는 문제는 null을 반환한다", async () => {
    const loaded = await repo.getAttempt("demo-pack", "1.0.0", "non-existent");
    expect(loaded).toBeNull();
  });

  it("putAttempt 후 getLastProblemId로 최근 저장된 문제 ID를 반환한다", async () => {
    await repo.putAttempt(sampleAttempt);
    const lastId = await repo.getLastProblemId("demo-pack", "1.0.0");
    expect(lastId).toBe("p-001");

    const secondAttempt: SavedAttempt = {
      ...sampleAttempt,
      problemId: "p-002",
      savedAt: new Date().toISOString(),
    };
    await repo.putAttempt(secondAttempt);
    const newLastId = await repo.getLastProblemId("demo-pack", "1.0.0");
    expect(newLastId).toBe("p-002");
  });

  it("listAttempts로 해당 팩/버전의 모든 기록을 조회한다", async () => {
    await repo.putAttempt(sampleAttempt);
    await repo.putAttempt({
      ...sampleAttempt,
      problemId: "p-002",
    });
    // 다른 팩 데이터
    await repo.putAttempt({
      ...sampleAttempt,
      packId: "other-pack",
      problemId: "p-001",
    });

    const attempts = await repo.listAttempts("demo-pack", "1.0.0");
    expect(attempts).toHaveLength(2);
  });

  it("트랜잭션 실패 또는 abort 시 원자성이 보장된다", async () => {
    // quota 초과 또는 abort 시뮬레이션
    const originalPut = IDBObjectStore.prototype.put;
    let callCount = 0;
    IDBObjectStore.prototype.put = function (value: unknown, key?: IDBValidKey) {
      callCount++;
      if (callCount === 2) {
        // meta 단계에서 에러 발생 유도
        throw new Error("Disk full");
      }
      return originalPut.call(this, value, key);
    };

    try {
      await expect(repo.putAttempt(sampleAttempt)).rejects.toThrow();
    } finally {
      IDBObjectStore.prototype.put = originalPut;
    }

    // attempts store에도 데이터가 없어야 함
    const loaded = await repo.getAttempt("demo-pack", "1.0.0", "p-001");
    expect(loaded).toBeNull();
  });

  it("hasOtherVersion으로 다른 버전의 동일 문제 저장 여부를 확인한다", async () => {
    await repo.putAttempt({
      ...sampleAttempt,
      contentVersion: "0.9.0",
    });

    const hasOther = await repo.hasOtherVersion("demo-pack", "1.0.0", "p-001");
    expect(hasOther).toBe(true);

    const hasOtherForUnknown = await repo.hasOtherVersion("demo-pack", "1.0.0", "p-999");
    expect(hasOtherForUnknown).toBe(false);
  });
});

describe("MemoryProgressRepository", () => {
  let repo: MemoryProgressRepository;

  beforeEach(() => {
    repo = new MemoryProgressRepository();
  });

  it("mode는 memory이다", () => {
    expect(repo.mode).toBe("memory");
  });

  it("putAttempt, getAttempt, listAttempts, getLastProblemId가 정상 작동한다", async () => {
    await repo.putAttempt(sampleAttempt);
    const loaded = (await repo.getAttempt("demo-pack", "1.0.0", "p-001")) as SavedAttempt;
    expect(loaded).toEqual(sampleAttempt);

    const lastId = await repo.getLastProblemId("demo-pack", "1.0.0");
    expect(lastId).toBe("p-001");

    const list = await repo.listAttempts("demo-pack", "1.0.0");
    expect(list).toHaveLength(1);
  });

  it("hasOtherVersion이 올바르게 동작한다", async () => {
    await repo.putAttempt({
      ...sampleAttempt,
      contentVersion: "0.9.0",
    });
    expect(await repo.hasOtherVersion("demo-pack", "1.0.0", "p-001")).toBe(true);
    expect(await repo.hasOtherVersion("demo-pack", "1.0.0", "p-002")).toBe(false);
  });
});

describe("createProgressRepository", () => {
  it("정상 환경에서 persistent 모드 저장소를 생성한다", async () => {
    const repo = await createProgressRepository({ dbName: `cognitive-test-${Date.now()}` });
    expect(repo.mode).toBe("persistent");
  });
});
