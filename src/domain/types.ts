export type Rotation = 0 | 90 | 180 | 270;
export type Side = "N" | "E" | "S" | "W";
export type Cell = { row: number; col: number };

export type PieceState =
  | { instanceId: string; location: "tray"; rotation: Rotation }
  | { instanceId: string; location: "board"; cell: Cell; rotation: Rotation };

export type BoardPieceState = Extract<PieceState, { location: "board" }>;

export interface Topology {
  ports: { id: string; side: Side; channel: string }[];
  internalNodes: string[];
  internalEdges: [string, string][];
}

export interface PieceType {
  id: string;
  judgeKey: string;
  name: string;
  asset: string;
  allowedRotations: Rotation[];
  equivalentRotations: Rotation[][];
  topology?: Topology;
}

export interface PieceInstance {
  id: string;
  typeId: string;
  locked: boolean;
}

export interface Requirements {
  minPlaced: number;
  maxPlaced: number;
  requireAllMovablePieces: boolean;
  requiredCells: Cell[];
  emptyCells: Cell[];
  requiredTypeCounts: { judgeKey: string; count: number }[];
}

export interface Terminal {
  id: string;
  cell: Cell;
  side: Side;
  channel: string;
}

export interface ExactJudge {
  mode: "exact";
  solutions: (null | { judgeKey: string; rotation: Rotation })[][];
}

export interface ConnectionJudge {
  mode: "connection";
  terminals: Terminal[];
  requiredPairs: [string, string][];
  forbiddenPairs: [string, string][];
  allowDanglingPorts: boolean;
  allowCycles: boolean;
  allowBranches: boolean;
  allowDisconnectedComponents: boolean;
}

export interface Problem {
  id: string;
  order: number;
  title: string;
  prompt: string[];
  pattern: {
    asset?: string;
    alt: string;
    description: string;
  };
  board: {
    rows: 5;
    cols: 5;
    blockedCells: Cell[];
  };
  pieces: PieceInstance[];
  initialPieces: PieceState[];
  requirements: Requirements;
  judge: ExactJudge | ConnectionJudge;
  difficulty?: 1 | 2 | 3;
}

export interface ContentPack {
  schemaVersion: 1;
  packId: string;
  contentVersion: string;
  purpose: "development" | "release";
  title: string;
  pieceTypes: PieceType[];
  problems: Problem[];
}

export interface JudgeResult {
  status: "correct" | "incorrect" | "incomplete" | "system_error";
  code: string;
  checkedRevision: number;
  debugReason?: string;
}

export type ContentErrorCode =
  | "CONTENT_INVALID"
  | "CONTENT_UNSUPPORTED_VERSION"
  | "CONTENT_INVALID_COUNT"
  | "CONTENT_INVALID_ORDER"
  | "CONTENT_INVALID_ROTATION"
  | "CONTENT_INVALID_FIXED"
  | "CONTENT_INVALID_RULE"
  | "CONTENT_INVALID_TOPOLOGY"
  | "CONTENT_INVALID_TERMINAL"
  | "CONTENT_INVALID_SOLUTION";

export interface ContentIssue {
  code: ContentErrorCode;
  path: string;
  problemId?: string | undefined;
  message?: string | undefined;
}

/** 검증 후 런타임에서 사용하는 인덱싱된 팩 */
export interface ResolvedPack extends ContentPack {
  typeById: Record<string, PieceType>;
  problemById: Record<string, Problem>;
  orderedProblems: Problem[];
  instanceLabel: Record<string, Record<string, number>>; // problemId -> instanceId -> 1부터 순번
  invalidProblems?: Record<string, ContentIssue[]> | undefined;
}
