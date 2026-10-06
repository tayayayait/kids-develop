export type Rotation = 0 | 90 | 180 | 270;
export type Side = "N" | "E" | "S" | "W";
export type Cell = { row: number; col: number };
export type PieceState =
  | { instanceId: string; location: "tray"; rotation: Rotation }
  | { instanceId: string; location: "board"; cell: Cell; rotation: Rotation };

export interface PieceType {
  id: string;
  judgeKey: string;
  name: string;
  shape: "straight" | "corner";
  allowedRotations: Rotation[];
  equivalentRotations: Rotation[][];
  topology: {
    ports: { id: string; side: Side; channel: string }[];
    internalNodes: string[];
    internalEdges: [string, string][];
  };
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
  pattern: { alt: string; description: string };
  board: { rows: 5; cols: 5; blockedCells: Cell[] };
  pieces: PieceInstance[];
  initialPieces: PieceState[];
  requirements: Requirements;
  judge: ConnectionJudge;
}
export interface JudgeResult {
  status: "correct" | "incorrect" | "incomplete" | "system_error";
  code: string;
  checkedRevision: number;
}
