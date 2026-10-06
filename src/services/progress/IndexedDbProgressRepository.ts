import type { ProgressRepository, SavedAttempt } from "./ProgressRepository";

function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class IndexedDbProgressRepository implements ProgressRepository {
  public readonly mode = "persistent" as const;
  private dbPromise: Promise<IDBDatabase> | null = null;
  private currentDb: IDBDatabase | null = null;

  constructor(private readonly dbName: string = "cognitive-board") {}

  private getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        if (typeof indexedDB === "undefined") {
          reject(new Error("IndexedDB is not available"));
          return;
        }

        const openReq = indexedDB.open(this.dbName, 1);

        openReq.onupgradeneeded = () => {
          const db = openReq.result;
          if (!db.objectStoreNames.contains("attempts")) {
            const attemptsStore = db.createObjectStore("attempts", {
              keyPath: ["packId", "contentVersion", "problemId"],
            });
            attemptsStore.createIndex("byPack", ["packId", "contentVersion"], {
              unique: false,
            });
            attemptsStore.createIndex("byProblem", ["packId", "problemId"], {
              unique: false,
            });
          }

          if (!db.objectStoreNames.contains("meta")) {
            db.createObjectStore("meta", { keyPath: "key" });
          }
        };

        openReq.onsuccess = () => {
          this.currentDb = openReq.result;
          resolve(openReq.result);
        };
        openReq.onerror = () => reject(openReq.error);
        openReq.onblocked = () => {
          console.warn("[IndexedDbProgressRepository] DB blocked");
        };
      });
    }
    return this.dbPromise;
  }

  async close(): Promise<void> {
    if (this.currentDb) {
      this.currentDb.close();
      this.currentDb = null;
    }
    this.dbPromise = null;
  }

  async getAttempt(
    packId: string,
    contentVersion: string,
    problemId: string,
  ): Promise<unknown | null> {
    const db = await this.getDB();
    const tx = db.transaction("attempts", "readonly");
    const store = tx.objectStore("attempts");
    const result = await req(store.get([packId, contentVersion, problemId]));
    return result ?? null;
  }

  async listAttempts(packId: string, contentVersion: string): Promise<unknown[]> {
    const db = await this.getDB();
    const tx = db.transaction("attempts", "readonly");
    const store = tx.objectStore("attempts");
    const index = store.index("byPack");
    const results = await req(index.getAll([packId, contentVersion]));
    return results || [];
  }

  async getLastProblemId(packId: string, contentVersion: string): Promise<string | null> {
    const db = await this.getDB();
    const tx = db.transaction("meta", "readonly");
    const store = tx.objectStore("meta");
    const result = await req(store.get(`last:${packId}@${contentVersion}`));
    if (result && typeof result === "object" && "problemId" in result) {
      return (result as { problemId: string }).problemId;
    }
    return null;
  }

  async putAttempt(attempt: SavedAttempt): Promise<void> {
    const db = await this.getDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["attempts", "meta"], "readwrite");

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));

      try {
        const attemptsStore = tx.objectStore("attempts");
        attemptsStore.put(attempt);

        const metaStore = tx.objectStore("meta");
        metaStore.put({
          key: `last:${attempt.packId}@${attempt.contentVersion}`,
          problemId: attempt.problemId,
          updatedAt: attempt.savedAt,
        });
      } catch (err) {
        try {
          tx.abort();
        } catch {
          // ignore if already closed
        }
        reject(err);
      }
    });
  }

  async hasOtherVersion(
    packId: string,
    contentVersion: string,
    problemId: string,
  ): Promise<boolean> {
    const db = await this.getDB();
    const tx = db.transaction("attempts", "readonly");
    const store = tx.objectStore("attempts");
    const index = store.index("byProblem");
    const records = (await req(index.getAll([packId, problemId]))) as SavedAttempt[];
    return records.some((r) => r.contentVersion !== contentVersion);
  }
}
