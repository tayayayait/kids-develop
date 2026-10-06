import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { MemoryProgressRepository } from "@/services/progress/MemoryProgressRepository";
import type { ProgressRepository, SavedAttempt } from "@/services/progress/ProgressRepository";
import { createSaveQueue, type AttemptSnapshot } from "@/services/progress/saveQueue";

const createSnapshot = (revision: number, problemId = "p-001"): AttemptSnapshot => ({
  packId: "demo-pack",
  contentVersion: "1.0.0",
  problemId,
  boardRevision: revision,
  pieces: [],
  everSolved: false,
  lastCheck: null,
});

describe("saveQueue", () => {
  let repo: MemoryProgressRepository;

  beforeEach(() => {
    vi.useFakeTimers();
    repo = new MemoryProgressRepository();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedule 호출 시 debounceMs(250ms) 후 저장된다", async () => {
    const queue = createSaveQueue(repo, { debounceMs: 250, maxWaitMs: 1000 });
    queue.schedule(createSnapshot(1));

    expect(await repo.getAttempt("demo-pack", "1.0.0", "p-001")).toBeNull();

    // 250ms 경과
    await vi.advanceTimersByTimeAsync(250);

    const saved = (await repo.getAttempt("demo-pack", "1.0.0", "p-001")) as SavedAttempt | null;
    expect(saved).not.toBeNull();
    expect(saved?.boardRevision).toBe(1);
  });

  it("빠른 연속 schedule 호출은 디바운스되어 최신 snapshot만 1회 저장된다", async () => {
    const queue = createSaveQueue(repo, { debounceMs: 250, maxWaitMs: 1000 });
    queue.schedule(createSnapshot(1));
    await vi.advanceTimersByTimeAsync(100);
    queue.schedule(createSnapshot(2));
    await vi.advanceTimersByTimeAsync(100);
    queue.schedule(createSnapshot(3));

    // 총 200ms 경과, 아직 저장 안 됨
    expect(await repo.getAttempt("demo-pack", "1.0.0", "p-001")).toBeNull();

    // 마지막 schedule 후 250ms 경과
    await vi.advanceTimersByTimeAsync(250);

    const saved = (await repo.getAttempt("demo-pack", "1.0.0", "p-001")) as SavedAttempt | null;
    expect(saved?.boardRevision).toBe(3);
  });

  it("연속 입력이 계속되어도 maxWaitMs(1000ms)에 도달하면 강제 저장된다", async () => {
    const queue = createSaveQueue(repo, { debounceMs: 250, maxWaitMs: 1000 });

    // 100ms마다 10회 schedule (총 1000ms)
    for (let i = 1; i <= 10; i++) {
      queue.schedule(createSnapshot(i));
      await vi.advanceTimersByTimeAsync(100);
    }

    // 1000ms 시점에 중간 강제 저장 실행됨
    const saved = (await repo.getAttempt("demo-pack", "1.0.0", "p-001")) as SavedAttempt | null;
    expect(saved).not.toBeNull();
    expect(saved?.boardRevision).toBeGreaterThanOrEqual(9);
  });

  it("now 호출은 디바운스를 건너뛰고 즉시 저장한다", async () => {
    const queue = createSaveQueue(repo);
    queue.now(createSnapshot(5));

    await vi.advanceTimersByTimeAsync(0);

    const saved = (await repo.getAttempt("demo-pack", "1.0.0", "p-001")) as SavedAttempt | null;
    expect(saved).not.toBeNull();
    expect(saved?.boardRevision).toBe(5);
  });

  it("쓰기 진행 중 새 snapshot이 오면 최신 1개만 pending 후 이어서 덮어쓴다", async () => {
    let resolveFirstPut: () => void = () => {};
    const delayedRepo = {
      ...repo,
      putAttempt: vi.fn().mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirstPut = resolve;
          }),
      ),
    };

    const queue = createSaveQueue(delayedRepo as unknown as ProgressRepository);
    queue.now(createSnapshot(1)); // 첫 번째 쓰기 시작 (대기 중)
    await vi.advanceTimersByTimeAsync(0);

    queue.schedule(createSnapshot(2));
    queue.schedule(createSnapshot(3)); // 3으로 덮어씀

    // 첫 번째 쓰기 완료
    resolveFirstPut();
    await vi.advanceTimersByTimeAsync(0);

    // 두 번째 쓰기가 완료되면 boardRevision 3이 저장되어야 함
    expect(delayedRepo.putAttempt).toHaveBeenCalledTimes(2);
    expect((delayedRepo.putAttempt.mock.calls[1]![0] as SavedAttempt).boardRevision).toBe(3);
  });

  it("flush 호출 시 대기 중인 snapshot을 즉시 저장하고 saved를 반환한다", async () => {
    const queue = createSaveQueue(repo, { debounceMs: 250 });
    queue.schedule(createSnapshot(7));

    const flushPromise = queue.flush(500);
    await vi.advanceTimersByTimeAsync(0);

    const result = await flushPromise;
    expect(result).toBe("saved");

    const saved = (await repo.getAttempt("demo-pack", "1.0.0", "p-001")) as SavedAttempt | null;
    expect(saved?.boardRevision).toBe(7);
  });

  it("저장 실패 시 onStatus('error')가 호출되고 큐는 다음 호출에서 정상 복구된다", async () => {
    const onStatus = vi.fn();
    const failingRepo = {
      ...repo,
      putAttempt: vi.fn().mockRejectedValueOnce(new Error("QuotaExceeded")),
    };

    const queue = createSaveQueue(failingRepo as unknown as ProgressRepository, { onStatus });
    queue.now(createSnapshot(1));
    await vi.advanceTimersByTimeAsync(0);

    expect(onStatus).toHaveBeenCalledWith("error");

    // 다음 호출은 성공하도록 설정
    failingRepo.putAttempt.mockResolvedValueOnce(undefined);
    queue.now(createSnapshot(2));
    await vi.advanceTimersByTimeAsync(0);

    expect(onStatus).toHaveBeenCalledWith("saved");
  });
});
