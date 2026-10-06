import type { ProgressRepository, SavedAttempt } from "./ProgressRepository";

export class MemoryProgressRepository implements ProgressRepository {
  public readonly mode = "memory" as const;
  private attempts = new Map<string, SavedAttempt>();
  private lastMeta = new Map<string, { problemId: string; updatedAt: string }>();

  private makeKey(packId: string, contentVersion: string, problemId: string): string {
    return `${packId}:::${contentVersion}:::${problemId}`;
  }

  async getAttempt(
    packId: string,
    contentVersion: string,
    problemId: string,
  ): Promise<unknown | null> {
    const key = this.makeKey(packId, contentVersion, problemId);
    return this.attempts.get(key) ?? null;
  }

  async listAttempts(packId: string, contentVersion: string): Promise<unknown[]> {
    const results: SavedAttempt[] = [];
    for (const attempt of this.attempts.values()) {
      if (attempt.packId === packId && attempt.contentVersion === contentVersion) {
        results.push(attempt);
      }
    }
    return results;
  }

  async getLastProblemId(packId: string, contentVersion: string): Promise<string | null> {
    const metaKey = `last:${packId}@${contentVersion}`;
    const meta = this.lastMeta.get(metaKey);
    return meta ? meta.problemId : null;
  }

  async putAttempt(attempt: SavedAttempt): Promise<void> {
    const key = this.makeKey(attempt.packId, attempt.contentVersion, attempt.problemId);
    this.attempts.set(key, attempt);

    const metaKey = `last:${attempt.packId}@${attempt.contentVersion}`;
    this.lastMeta.set(metaKey, {
      problemId: attempt.problemId,
      updatedAt: attempt.savedAt,
    });
  }

  async hasOtherVersion(
    packId: string,
    contentVersion: string,
    problemId: string,
  ): Promise<boolean> {
    for (const attempt of this.attempts.values()) {
      if (
        attempt.packId === packId &&
        attempt.problemId === problemId &&
        attempt.contentVersion !== contentVersion
      ) {
        return true;
      }
    }
    return false;
  }
}
