import devPackJson from "@/content/packs/engineering-demo.json";
import { validateContent } from "@/domain/content/validateContent";
import type { PieceType, Problem } from "./types";

const validation = validateContent(devPackJson);
if (!validation.ok) {
  throw new Error(`Failed to load engineering-demo.json: ${JSON.stringify(validation.errors)}`);
}

const resolved = validation.pack;

export const CONTENT_VERSION = resolved.contentVersion;
export const PACK_TITLE = resolved.title;

// 기존 타입과 호환성을 위해 shape 프로퍼티 부여
export const pieceTypes: PieceType[] = resolved.pieceTypes.map((pt) => ({
  ...pt,
  shape: pt.id.includes("corner") ? "corner" : "straight",
})) as unknown as PieceType[];

export const typeById: Record<string, PieceType> = Object.fromEntries(
  pieceTypes.map((t) => [t.id, t]),
);

export const problems: Problem[] = resolved.problems as unknown as Problem[];

export const problemById = (id: string): Problem | undefined => problems.find((p) => p.id === id);

export const resolvedPack = resolved;
