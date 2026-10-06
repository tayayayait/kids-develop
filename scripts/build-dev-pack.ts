import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface Spec {
  title: string;
  path: [number, number][];
  start: "N" | "E" | "S" | "W";
  end: "N" | "E" | "S" | "W";
  blocked?: [number, number][];
}

const specs: Spec[] = [
  {
    title: "두 끝을 이어 보세요",
    path: [
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3],
      [2, 4],
    ],
    start: "W",
    end: "E",
  },
  {
    title: "맨 윗줄 길",
    path: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ],
    start: "W",
    end: "E",
  },
  {
    title: "위에서 아래로",
    path: [
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
      [4, 2],
    ],
    start: "N",
    end: "S",
  },
  {
    title: "한 번 꺾어요",
    path: [
      [2, 0],
      [2, 1],
      [2, 2],
      [3, 2],
      [4, 2],
    ],
    start: "W",
    end: "S",
  },
  {
    title: "계단 한 칸",
    path: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
      [2, 2],
      [2, 3],
      [2, 4],
    ],
    start: "W",
    end: "E",
  },
  {
    title: "지그재그 길",
    path: [
      [0, 1],
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 3],
      [3, 3],
      [4, 3],
    ],
    start: "N",
    end: "S",
  },
  {
    title: "골짜기를 지나요",
    path: [
      [1, 0],
      [1, 1],
      [2, 1],
      [3, 1],
      [3, 2],
      [3, 3],
      [2, 3],
      [1, 3],
      [1, 4],
    ],
    start: "W",
    end: "E",
  },
  {
    title: "돌을 피해 가요",
    path: [
      [2, 0],
      [2, 1],
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 3],
      [2, 4],
    ],
    start: "W",
    end: "E",
    blocked: [[2, 2]],
  },
  {
    title: "큰 ㄱ자 길",
    path: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [1, 4],
      [2, 4],
      [3, 4],
      [4, 4],
    ],
    start: "W",
    end: "S",
  },
  {
    title: "내려가는 계단",
    path: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2],
      [3, 2],
      [3, 3],
      [4, 3],
      [4, 4],
    ],
    start: "N",
    end: "S",
  },
  {
    title: "오른쪽에서 왼쪽으로",
    path: [
      [0, 4],
      [0, 3],
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
      [4, 2],
      [4, 1],
      [4, 0],
    ],
    start: "E",
    end: "W",
  },
  {
    title: "막힌 칸 사이로",
    path: [
      [0, 2],
      [1, 2],
      [1, 3],
      [2, 3],
      [2, 4],
    ],
    start: "N",
    end: "E",
    blocked: [
      [2, 2],
      [1, 1],
      [3, 3],
    ],
  },
  {
    title: "산을 넘어요",
    path: [
      [4, 0],
      [4, 1],
      [3, 1],
      [2, 1],
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 3],
      [3, 3],
      [4, 3],
      [4, 4],
    ],
    start: "W",
    end: "E",
  },
  {
    title: "구불구불 뱀",
    path: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
      [2, 2],
      [2, 1],
      [2, 0],
      [3, 0],
      [4, 0],
      [4, 1],
      [4, 2],
      [4, 3],
      [4, 4],
    ],
    start: "W",
    end: "E",
  },
  {
    title: "긴 뱀길",
    path: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [1, 4],
      [1, 3],
      [1, 2],
      [1, 1],
      [1, 0],
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3],
      [2, 4],
    ],
    start: "W",
    end: "E",
  },
];

const sideName: Record<string, string> = { N: "위쪽", E: "오른쪽", S: "아래쪽", W: "왼쪽" };

const dir = (
  a: { row: number; col: number },
  b: { row: number; col: number },
): "N" | "E" | "S" | "W" => (b.row < a.row ? "N" : b.row > a.row ? "S" : b.col > a.col ? "E" : "W");

const pieceTypes = [
  {
    id: "straight-blue",
    judgeKey: "straight-blue",
    name: "파란 직선",
    asset: "assets/pieces/straight-blue.svg",
    allowedRotations: [0, 90, 180, 270],
    equivalentRotations: [
      [0, 180],
      [90, 270],
    ],
    topology: {
      ports: [
        { id: "w", side: "W", channel: "blue" },
        { id: "e", side: "E", channel: "blue" },
      ],
      internalNodes: [],
      internalEdges: [["w", "e"]],
    },
  },
  {
    id: "corner-blue",
    judgeKey: "corner-blue",
    name: "파란 꺾임",
    asset: "assets/pieces/corner-blue.svg",
    allowedRotations: [0, 90, 180, 270],
    equivalentRotations: [[0], [90], [180], [270]],
    topology: {
      ports: [
        { id: "n", side: "N", channel: "blue" },
        { id: "e", side: "E", channel: "blue" },
      ],
      internalNodes: [],
      internalEdges: [["n", "e"]],
    },
  },
];

const problems = specs.map((spec, i) => {
  const cells = spec.path.map(([row, col]) => ({ row, col }));
  let straight = 0;
  let corner = 0;
  cells.forEach((c, k) => {
    const a = k === 0 ? spec.start : dir(c, cells[k - 1]!);
    const b = k === cells.length - 1 ? spec.end : dir(c, cells[k + 1]!);
    const opposite =
      (a === "N" && b === "S") ||
      (a === "S" && b === "N") ||
      (a === "E" && b === "W") ||
      (a === "W" && b === "E");
    if (opposite) straight++;
    else corner++;
  });

  const pieces = [
    ...Array.from({ length: straight }, (_, k) => ({
      id: `line-${k + 1}`,
      typeId: "straight-blue",
      locked: false,
    })),
    ...Array.from({ length: corner }, (_, k) => ({
      id: `bend-${k + 1}`,
      typeId: "corner-blue",
      locked: false,
    })),
  ];

  const initialPieces = pieces.map((p) => ({
    instanceId: p.id,
    location: "tray" as const,
    rotation: 0 as const,
  }));

  const s = cells[0]!;
  const e = cells[cells.length - 1]!;
  const prompt = [`조각 ${pieces.length}개를 모두 사용해요.`, "두 파란 끝점을 하나의 길로 이어요."];
  if (spec.blocked?.length) prompt.push("빗금 칸에는 놓을 수 없어요.");

  const id = `p-${String(i + 1).padStart(3, "0")}`;

  // 문제 커버리지 커스텀 (p-003: exact 모드, p-009: locked 고정 조각 포함)
  if (id === "p-003") {
    // p-003: "위에서 아래로", (0,2)~(4,2) 세로 직선 5개
    // exact solutions: 25칸 배열
    const sol = Array(25).fill(null);
    for (let r = 0; r < 5; r++) {
      sol[r * 5 + 2] = { judgeKey: "straight-blue", rotation: 90 };
    }
    return {
      id,
      order: i + 1,
      title: spec.title,
      prompt,
      pattern: {
        alt: "5×5 보드에 파란 끝점 두 개가 있어요.",
        description: `파란 끝점은 ${s.row + 1}행 ${s.col + 1}열의 ${sideName[spec.start]}과 ${e.row + 1}행 ${e.col + 1}열의 ${sideName[spec.end]}에 있어요.`,
      },
      board: { rows: 5, cols: 5, blockedCells: [] },
      pieces,
      initialPieces,
      requirements: {
        minPlaced: pieces.length,
        maxPlaced: pieces.length,
        requireAllMovablePieces: true,
        requiredCells: [s, e],
        emptyCells: [],
        requiredTypeCounts: [{ judgeKey: "straight-blue", count: 5 }],
      },
      judge: {
        mode: "exact" as const,
        solutions: [sol],
      },
    };
  }

  if (id === "p-009") {
    // p-009: "큰 ㄱ자 길" -> 첫 조각 (0,0)을 locked 고정 조각으로 설정
    pieces[0]!.locked = true;
    initialPieces[0] = {
      instanceId: pieces[0]!.id,
      location: "board",
      cell: { row: 0, col: 0 },
      rotation: 0,
    };
    prompt.push("자물쇠 조각은 움직이지 않아요.");
  }

  return {
    id,
    order: i + 1,
    title: spec.title,
    prompt,
    pattern: {
      alt: "5×5 보드에 파란 끝점 두 개가 있어요.",
      description: `파란 끝점은 ${s.row + 1}행 ${s.col + 1}열의 ${sideName[spec.start]}과 ${e.row + 1}행 ${e.col + 1}열의 ${sideName[spec.end]}에 있어요.`,
    },
    board: {
      rows: 5,
      cols: 5,
      blockedCells: (spec.blocked ?? []).map(([row, col]) => ({ row, col })),
    },
    pieces,
    initialPieces,
    requirements: {
      minPlaced: pieces.length,
      maxPlaced: pieces.length,
      requireAllMovablePieces: true,
      requiredCells: [s, e],
      emptyCells: [],
      requiredTypeCounts: [],
    },
    judge: {
      mode: "connection" as const,
      terminals: [
        { id: "start", cell: s, side: spec.start, channel: "blue" },
        { id: "finish", cell: e, side: spec.end, channel: "blue" },
      ],
      requiredPairs: [["start", "finish"]] as [string, string][],
      forbiddenPairs: [] as [string, string][],
      allowDanglingPorts: false,
      allowCycles: false,
      allowBranches: false,
      allowDisconnectedComponents: false,
    },
  };
});

const pack = {
  schemaVersion: 1,
  packId: "engineering-demo",
  contentVersion: "1.0.0",
  purpose: "development",
  title: "생각 연결 보드",
  pieceTypes,
  problems,
};

const outDir = path.resolve(__dirname, "../src/content/packs");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "engineering-demo.json"),
  JSON.stringify(pack, null, 2),
  "utf-8",
);
console.log("Successfully generated engineering-demo.json with 15 problems.");
