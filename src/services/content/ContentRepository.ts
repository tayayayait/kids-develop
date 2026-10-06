import { validateContent } from "@/domain/content/validateContent";
import type { ContentErrorCode, ContentIssue, ResolvedPack } from "@/domain/types";
import { BundledContentSource } from "./BundledContentSource";

export interface ContentSource {
  loadRaw(): Promise<unknown>;
}

export class ContentError extends Error {
  constructor(
    public readonly code: ContentErrorCode | "NETWORK_FAILED" | "ACCESS_DENIED" | "NOT_FOUND",
    public readonly issues?: ContentIssue[] | undefined,
  ) {
    super(code);
    this.name = "ContentError";
  }
}

export interface ContentRepository {
  getPack(): Promise<ResolvedPack>;
  reset(): void;
}

export function createContentRepository(source: ContentSource): ContentRepository {
  let cache: Promise<ResolvedPack> | null = null;

  return {
    getPack(): Promise<ResolvedPack> {
      if (!cache) {
        cache = (async () => {
          try {
            const raw = await source.loadRaw();
            const result = validateContent(raw);
            if (!result.ok) {
              const primaryError = result.errors[0]?.code || "CONTENT_INVALID";
              throw new ContentError(primaryError, result.errors);
            }
            return result.pack;
          } catch (err) {
            // 실패한 요청은 캐시에서 제거하여 다음 시도 시 재요청 가능하게 함
            cache = null;
            if (err instanceof ContentError) throw err;
            throw new ContentError("NETWORK_FAILED");
          }
        })();
      }
      return cache;
    },
    reset() {
      cache = null;
    },
  };
}

export const contentRepository = createContentRepository(new BundledContentSource());
