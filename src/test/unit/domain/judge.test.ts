import { describe, expect, it } from "vitest";
import type { PieceState, Problem, ResolvedPack, Rotation } from "@/domain/types";
import { validateContent } from "@/domain/content/validateContent";
import { evaluate, validateState } from "@/domain/judge/evaluate";
import { normalizeRotation } from "@/domain/judge/rotation";

import demo01PackRaw from "../../fixtures/judge/demo-001.json";
import demo01SolRaw from "../../fixtures/judge/demo-001-solution.json";
import engineeringDemoRaw from "@/content/packs/engineering-demo.json";

describe("Domain Judge Engine (evaluate, validateState, normalizeRotation)", () => {
  const packRes = validateContent(demo01PackRaw);
  if (!packRes.ok) {
    throw new Error("Fixture validation failed");
  }
  const demoPack = packRes.pack;
  const demoProblem = demoPack.problems[0];

  const engRes = validateContent(engineeringDemoRaw);
  if (!engRes.ok) {
    throw new Error("Engineering demo validation failed");
  }
  const engPack = engRes.pack;

  describe("2-4 Rotation Normalization (normalizeRotation)", () => {
    it("직선 조각: 0과 180은 0으로, 90과 270은 90으로 정규화된다", () => {
      const straightType = demoPack.typeById["straight-blue"];
      expect(normalizeRotation(straightType, 0)).toBe(0);
      expect(normalizeRotation(straightType, 180)).toBe(0);
      expect(normalizeRotation(straightType, 90)).toBe(90);
      expect(normalizeRotation(straightType, 270)).toBe(90);
    });

    it("꺾임 조각: 회전별로 독립적이므로 각도 그대로 반환된다", () => {
      const cornerType = engPack.typeById["corner-blue"];
      expect(normalizeRotation(cornerType, 0)).toBe(0);
      expect(normalizeRotation(cornerType, 90)).toBe(90);
      expect(normalizeRotation(cornerType, 180)).toBe(180);
      expect(normalizeRotation(cornerType, 270)).toBe(270);
    });
  });

  describe("2-2 불변식 검사 (validateState)", () => {
    it("정상 배치 상태는 ok: true를 반환한다", () => {
      const validPieces = demo01SolRaw.pieces as PieceState[];
      const res = validateState(demoPack, demoProblem, validPieces);
      expect(res.ok).toBe(true);
    });

    it("J04: 존재하지 않는 instanceId를 포함하면 ok: false (INVALID_STATE)", () => {
      const pieces: PieceState[] = [
        ...(demo01SolRaw.pieces as PieceState[]).slice(1),
        { instanceId: "unknown-id", location: "tray", rotation: 0 },
      ];
      const res = validateState(demoPack, demoProblem, pieces);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("INVALID_STATE");
    });

    it("J04: 조각 수가 문제 정의와 다르면 ok: false", () => {
      const pieces = (demo01SolRaw.pieces as PieceState[]).slice(0, 4);
      const res = validateState(demoPack, demoProblem, pieces);
      expect(res.ok).toBe(false);
    });

    it("J04: 중복된 instanceId가 있으면 ok: false", () => {
      const pieces: PieceState[] = [
        ...(demo01SolRaw.pieces as PieceState[]).slice(0, 4),
        { instanceId: "line-01", location: "tray", rotation: 0 },
      ];
      const res = validateState(demoPack, demoProblem, pieces);
      expect(res.ok).toBe(false);
    });

    it("J04: 허용되지 않은 각도(예: 45)면 ok: false", () => {
      const pieces: PieceState[] = [
        ...(demo01SolRaw.pieces as PieceState[]).slice(1),
        {
          instanceId: "line-01",
          location: "board",
          cell: { row: 2, col: 0 },
          rotation: 45 as unknown as Rotation,
        },
      ];
      const res = validateState(demoPack, demoProblem, pieces);
      expect(res.ok).toBe(false);
    });

    it("J04: 보드 좌표가 범위 밖(예: 5)이거나 정수가 아니면 ok: false", () => {
      const pieces: PieceState[] = [
        ...(demo01SolRaw.pieces as PieceState[]).slice(1),
        { instanceId: "line-01", location: "board", cell: { row: 5, col: 0 }, rotation: 0 },
      ];
      const res = validateState(demoPack, demoProblem, pieces);
      expect(res.ok).toBe(false);
    });

    it("보드 좌표 점유가 중복되면 ok: false", () => {
      const pieces: PieceState[] = [
        ...(demo01SolRaw.pieces as PieceState[]).slice(2),
        { instanceId: "line-01", location: "board", cell: { row: 2, col: 0 }, rotation: 0 },
        { instanceId: "line-02", location: "board", cell: { row: 2, col: 0 }, rotation: 0 },
      ];
      const res = validateState(demoPack, demoProblem, pieces);
      expect(res.ok).toBe(false);
    });

    it("J04: locked 조각이 initialPieces와 다른 위치 또는 각도로 이동되면 ok: false", () => {
      // p-009는 첫 번째 조각이 locked
      const p9 = engPack.problemById["p-009"];
      expect(p9).toBeDefined();
      const initial = p9.initialPieces;
      // locked 조각(line-1)의 각도를 변경
      const modified: PieceState[] = initial.map((p) =>
        p.instanceId === "line-1" ? { ...p, rotation: ((p.rotation + 90) % 360) as Rotation } : p,
      );
      const res = validateState(engPack, p9, modified);
      expect(res.ok).toBe(false);
    });
  });

  describe("2-1 evaluate 순수성 & 불변성", () => {
    it("입력 배열과 객체가 freeze되어 있어도 evaluate가 정상 동작하고 수정을 시도하지 않는다", () => {
      const pieces = JSON.parse(JSON.stringify(demo01SolRaw.pieces)) as PieceState[];
      pieces.forEach((p) => Object.freeze(p));
      Object.freeze(pieces);

      const res = evaluate(demoPack, demoProblem, pieces, 10);
      expect(res.status).toBe("correct");
      expect(res.checkedRevision).toBe(10);
    });
  });

  describe("2-6 Connection 판정 (J01, J02, J03, J08~J13)", () => {
    it("J01: 상세서 11.3 fixture 정답 배치 -> correct", () => {
      const pieces = demo01SolRaw.pieces as PieceState[];
      const res = evaluate(demoPack, demoProblem, pieces, 1);
      expect(res.status).toBe("correct");
      expect(res.code).toBe("ALL_RULES_MET");
    });

    it("J02: 동일 judgeKey를 가진 line-01과 line-05의 위치 교환 -> correct", () => {
      const pieces: PieceState[] = [
        { instanceId: "line-01", location: "board", cell: { row: 2, col: 4 }, rotation: 0 },
        { instanceId: "line-02", location: "board", cell: { row: 2, col: 1 }, rotation: 0 },
        { instanceId: "line-03", location: "board", cell: { row: 2, col: 2 }, rotation: 0 },
        { instanceId: "line-04", location: "board", cell: { row: 2, col: 3 }, rotation: 0 },
        { instanceId: "line-05", location: "board", cell: { row: 2, col: 0 }, rotation: 0 },
      ];
      const res = evaluate(demoPack, demoProblem, pieces, 2);
      expect(res.status).toBe("correct");
    });

    it("J03: line-03을 180° 회전해도 연결 유지 -> correct", () => {
      const pieces: PieceState[] = (demo01SolRaw.pieces as PieceState[]).map((p) =>
        p.instanceId === "line-03" ? { ...p, rotation: 180 } : p,
      );
      const res = evaluate(demoPack, demoProblem, pieces, 3);
      expect(res.status).toBe("correct");
    });

    it("J03: line-03을 90° 회전하면 연결 단절 -> incorrect (RULE_NOT_MET)", () => {
      const pieces: PieceState[] = (demo01SolRaw.pieces as PieceState[]).map((p) =>
        p.instanceId === "line-03" ? { ...p, rotation: 90 } : p,
      );
      const res = evaluate(demoPack, demoProblem, pieces, 4);
      expect(res.status).toBe("incorrect");
      expect(res.code).toBe("RULE_NOT_MET");
    });

    it("J11: allowDanglingPorts: false일 때 열린 포트가 있으면 incorrect", () => {
      // 5개 중 1개를 경로 외 엉뚱한 곳에 두고 끝점을 열어둠
      const pieces: PieceState[] = (demo01SolRaw.pieces as PieceState[]).map((p) =>
        p.instanceId === "line-03"
          ? { ...p, location: "board", cell: { row: 0, col: 0 }, rotation: 0 }
          : p,
      );
      const res = evaluate(demoPack, demoProblem, pieces, 5);
      expect(res.status).toBe("incorrect");
    });

    it("J12: required 연결되었으나 forbidden도 연결되었으면 incorrect", () => {
      // demo-001을 복제하여 start와 finish를 forbiddenPairs에도 추가
      const modifiedProblem: Problem = {
        ...demoProblem,
        judge: {
          ...demoProblem.judge,
          mode: "connection",
          terminals: demoProblem.judge.mode === "connection" ? demoProblem.judge.terminals : [],
          requiredPairs: [["start", "finish"]],
          forbiddenPairs: [["start", "finish"]],
          allowDanglingPorts: false,
          allowCycles: false,
          allowBranches: false,
          allowDisconnectedComponents: false,
        },
      };
      const pieces = demo01SolRaw.pieces as PieceState[];
      const res = evaluate(demoPack, modifiedProblem, pieces, 6);
      expect(res.status).toBe("incorrect");
      expect(res.code).toBe("RULE_NOT_MET");
    });

    it("J10: 2x2 고리 순환(cycle) 형성 시 allowCycles false이면 incorrect", () => {
      // corner 4개로 2x2 고리를 만드는 가상 문제
      const ringProblem: Problem = {
        id: "ring-prob",
        order: 99,
        title: "고리 문제",
        prompt: ["고리"],
        pattern: { alt: "alt", description: "desc" },
        board: { rows: 5, cols: 5, blockedCells: [] },
        pieces: [
          { id: "c-1", typeId: "corner-blue", locked: false },
          { id: "c-2", typeId: "corner-blue", locked: false },
          { id: "c-3", typeId: "corner-blue", locked: false },
          { id: "c-4", typeId: "corner-blue", locked: false },
        ],
        initialPieces: [
          { instanceId: "c-1", location: "tray", rotation: 0 },
          { instanceId: "c-2", location: "tray", rotation: 0 },
          { instanceId: "c-3", location: "tray", rotation: 0 },
          { instanceId: "c-4", location: "tray", rotation: 0 },
        ],
        requirements: {
          minPlaced: 4,
          maxPlaced: 4,
          requireAllMovablePieces: true,
          requiredCells: [],
          emptyCells: [],
          requiredTypeCounts: [{ judgeKey: "corner-blue", count: 4 }],
        },
        judge: {
          mode: "connection",
          terminals: [],
          requiredPairs: [],
          forbiddenPairs: [],
          allowDanglingPorts: false,
          allowCycles: false,
          allowBranches: false,
          allowDisconnectedComponents: false,
        },
      };

      // 4개 코너로 닫힌 루프 구성:
      // (0,0): S-E (rot 90: N->E, E->S)
      // (0,1): S-W (rot 180: N->S, E->W)
      // (1,1): N-W (rot 270: N->W, E->N)
      // (1,0): N-E (rot 0: N, E)
      const pieces: PieceState[] = [
        { instanceId: "c-1", location: "board", cell: { row: 0, col: 0 }, rotation: 90 },
        { instanceId: "c-2", location: "board", cell: { row: 0, col: 1 }, rotation: 180 },
        { instanceId: "c-3", location: "board", cell: { row: 1, col: 1 }, rotation: 270 },
        { instanceId: "c-4", location: "board", cell: { row: 1, col: 0 }, rotation: 0 },
      ];

      const resNoCycle = evaluate(engPack, ringProblem, pieces, 7);
      expect(resNoCycle.status).toBe("incorrect");

      // allowCycles: true인 경우
      const allowCycleProb: Problem = {
        ...ringProblem,
        judge: {
          ...ringProblem.judge,
          mode: "connection",
          terminals: [],
          requiredPairs: [],
          forbiddenPairs: [],
          allowCycles: true,
          allowDanglingPorts: false,
          allowBranches: false,
          allowDisconnectedComponents: false,
        },
      };
      const resCycleAllowed = evaluate(engPack, allowCycleProb, pieces, 8);
      expect(resCycleAllowed.status).toBe("correct");
    });

    it("J08: 교차 타입(N-S, E-W 독립)에서 N과 E 터미널 연결 시도 -> incorrect", () => {
      // 교차 타입 등록된 가상 팩
      const crossPack: ResolvedPack = {
        ...engPack,
        typeById: {
          ...engPack.typeById,
          "cross-blue": {
            id: "cross-blue",
            judgeKey: "cross-blue",
            name: "파란 교차",
            asset: "assets/pieces/straight-blue.svg",
            allowedRotations: [0],
            equivalentRotations: [[0]],
            topology: {
              ports: [
                { id: "n", side: "N", channel: "blue" },
                { id: "s", side: "S", channel: "blue" },
                { id: "e", side: "E", channel: "blue" },
                { id: "w", side: "W", channel: "blue" },
              ],
              internalNodes: [],
              internalEdges: [
                ["n", "s"],
                ["e", "w"],
              ],
            },
          },
        },
      };

      const crossProb: Problem = {
        id: "cross-prob",
        order: 101,
        title: "교차 문제",
        prompt: ["교차"],
        pattern: { alt: "alt", description: "desc" },
        board: { rows: 5, cols: 5, blockedCells: [] },
        pieces: [{ id: "x-1", typeId: "cross-blue", locked: false }],
        initialPieces: [{ instanceId: "x-1", location: "tray", rotation: 0 }],
        requirements: {
          minPlaced: 1,
          maxPlaced: 1,
          requireAllMovablePieces: true,
          requiredCells: [{ row: 0, col: 0 }],
          emptyCells: [],
          requiredTypeCounts: [{ judgeKey: "cross-blue", count: 1 }],
        },
        judge: {
          mode: "connection",
          terminals: [
            { id: "t-n", cell: { row: 0, col: 0 }, side: "N", channel: "blue" },
            { id: "t-e", cell: { row: 0, col: 0 }, side: "E", channel: "blue" },
          ],
          requiredPairs: [["t-n", "t-e"]],
          forbiddenPairs: [],
          allowDanglingPorts: true,
          allowCycles: true,
          allowBranches: true,
          allowDisconnectedComponents: true,
        },
      };

      const pieces: PieceState[] = [
        { instanceId: "x-1", location: "board", cell: { row: 0, col: 0 }, rotation: 0 },
      ];

      const res = evaluate(crossPack, crossProb, pieces, 9);
      expect(res.status).toBe("incorrect");
    });

    it("J09: T자 분기(차수 3) 발생 시 allowBranches false/true 판정", () => {
      const tPack: ResolvedPack = {
        ...engPack,
        typeById: {
          ...engPack.typeById,
          "t-blue": {
            id: "t-blue",
            judgeKey: "t-blue",
            name: "파란 T자",
            asset: "assets/pieces/straight-blue.svg",
            allowedRotations: [0],
            equivalentRotations: [[0]],
            topology: {
              ports: [
                { id: "w", side: "W", channel: "blue" },
                { id: "e", side: "E", channel: "blue" },
                { id: "s", side: "S", channel: "blue" },
              ],
              internalNodes: ["center"],
              internalEdges: [
                ["w", "center"],
                ["e", "center"],
                ["s", "center"],
              ],
            },
          },
        },
      };

      const tProb: Problem = {
        id: "t-prob",
        order: 102,
        title: "T자 문제",
        prompt: ["T자"],
        pattern: { alt: "alt", description: "desc" },
        board: { rows: 5, cols: 5, blockedCells: [] },
        pieces: [{ id: "t-1", typeId: "t-blue", locked: false }],
        initialPieces: [{ instanceId: "t-1", location: "tray", rotation: 0 }],
        requirements: {
          minPlaced: 1,
          maxPlaced: 1,
          requireAllMovablePieces: true,
          requiredCells: [{ row: 0, col: 0 }],
          emptyCells: [],
          requiredTypeCounts: [{ judgeKey: "t-blue", count: 1 }],
        },
        judge: {
          mode: "connection",
          terminals: [],
          requiredPairs: [],
          forbiddenPairs: [],
          allowDanglingPorts: true,
          allowCycles: false,
          allowBranches: false,
          allowDisconnectedComponents: true,
        },
      };

      const pieces: PieceState[] = [
        { instanceId: "t-1", location: "board", cell: { row: 0, col: 0 }, rotation: 0 },
      ];

      // allowBranches: false -> incorrect
      const resFalse = evaluate(tPack, tProb, pieces, 10);
      expect(resFalse.status).toBe("incorrect");

      // allowBranches: true -> correct
      const tProbTrue: Problem = {
        ...tProb,
        judge: {
          ...tProb.judge,
          mode: "connection",
          terminals: [],
          requiredPairs: [],
          forbiddenPairs: [],
          allowDanglingPorts: true,
          allowCycles: false,
          allowBranches: true,
          allowDisconnectedComponents: true,
        },
      };
      const resTrue = evaluate(tPack, tProbTrue, pieces, 11);
      expect(resTrue.status).toBe("correct");
    });

    it("J13: 연결 요소가 2개로 분리되었을 때 allowDisconnectedComponents false/true 판정", () => {
      // 2개의 독립된 직선 조각 배치
      const disconnectedProb: Problem = {
        id: "disconn-prob",
        order: 103,
        title: "분리 성분 문제",
        prompt: ["분리 성분"],
        pattern: { alt: "alt", description: "desc" },
        board: { rows: 5, cols: 5, blockedCells: [] },
        pieces: [
          { id: "l-1", typeId: "straight-blue", locked: false },
          { id: "l-2", typeId: "straight-blue", locked: false },
        ],
        initialPieces: [
          { instanceId: "l-1", location: "tray", rotation: 0 },
          { instanceId: "l-2", location: "tray", rotation: 0 },
        ],
        requirements: {
          minPlaced: 2,
          maxPlaced: 2,
          requireAllMovablePieces: true,
          requiredCells: [
            { row: 0, col: 0 },
            { row: 2, col: 2 },
          ],
          emptyCells: [],
          requiredTypeCounts: [{ judgeKey: "straight-blue", count: 2 }],
        },
        judge: {
          mode: "connection",
          terminals: [],
          requiredPairs: [],
          forbiddenPairs: [],
          allowDanglingPorts: true,
          allowCycles: false,
          allowBranches: false,
          allowDisconnectedComponents: false,
        },
      };

      const pieces: PieceState[] = [
        { instanceId: "l-1", location: "board", cell: { row: 0, col: 0 }, rotation: 0 },
        { instanceId: "l-2", location: "board", cell: { row: 2, col: 2 }, rotation: 0 },
      ];

      // allowDisconnectedComponents: false -> incorrect
      const resFalse = evaluate(engPack, disconnectedProb, pieces, 12);
      expect(resFalse.status).toBe("incorrect");

      // allowDisconnectedComponents: true -> correct
      const disconnProbTrue: Problem = {
        ...disconnectedProb,
        judge: {
          ...disconnectedProb.judge,
          mode: "connection",
          terminals: [],
          requiredPairs: [],
          forbiddenPairs: [],
          allowDanglingPorts: true,
          allowCycles: false,
          allowBranches: false,
          allowDisconnectedComponents: true,
        },
      };
      const resTrue = evaluate(engPack, disconnProbTrue, pieces, 13);
      expect(resTrue.status).toBe("correct");
    });

    it("PERF: evaluate를 100회 반복 실행해도 총 50ms 미만으로 신속히 완료된다", () => {
      const pieces = demo01SolRaw.pieces as PieceState[];
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        evaluate(demoPack, demoProblem, pieces, i);
      }
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe("2-5 Exact 판정 (J05, J06)", () => {
    // exact 문제 fixture (p-003 기반 또는 커스텀 exact)
    const exactProblem: Problem = {
      id: "exact-prob",
      order: 100,
      title: "정확 일치 문제",
      prompt: ["정확 일치"],
      pattern: { alt: "alt", description: "desc" },
      board: { rows: 5, cols: 5, blockedCells: [] },
      pieces: [
        { id: "s-1", typeId: "straight-blue", locked: false },
        { id: "s-2", typeId: "straight-blue", locked: false },
      ],
      initialPieces: [
        { instanceId: "s-1", location: "tray", rotation: 0 },
        { instanceId: "s-2", location: "tray", rotation: 0 },
      ],
      requirements: {
        minPlaced: 2,
        maxPlaced: 2,
        requireAllMovablePieces: true,
        requiredCells: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ],
        emptyCells: [],
        requiredTypeCounts: [{ judgeKey: "straight-blue", count: 2 }],
      },
      judge: {
        mode: "exact",
        solutions: [
          // Sol 1: (0,0)=0도, (0,1)=0도
          Array.from({ length: 25 }, (_, i) => {
            if (i === 0) return { judgeKey: "straight-blue", rotation: 0 };
            if (i === 1) return { judgeKey: "straight-blue", rotation: 0 };
            return null;
          }),
          // Sol 2: (0,0)=90도, (0,1)=90도
          Array.from({ length: 25 }, (_, i) => {
            if (i === 0) return { judgeKey: "straight-blue", rotation: 90 };
            if (i === 1) return { judgeKey: "straight-blue", rotation: 90 };
            return null;
          }),
        ],
      },
    };

    it("J05: exact 모드 25칸 일치 (등가 회전 180도도 0도로 인식) -> correct", () => {
      // s-1은 180도(등가 0도), s-2는 0도
      const pieces: PieceState[] = [
        { instanceId: "s-1", location: "board", cell: { row: 0, col: 0 }, rotation: 180 },
        { instanceId: "s-2", location: "board", cell: { row: 0, col: 1 }, rotation: 0 },
      ];
      const res = evaluate(engPack, exactProblem, pieces, 9);
      expect(res.status).toBe("correct");
    });

    it("J06: 두 번째 솔루션(Sol 2: 90도, 90도)과 일치해도 correct", () => {
      // s-1은 270도(등가 90도), s-2는 90도
      const pieces: PieceState[] = [
        { instanceId: "s-1", location: "board", cell: { row: 0, col: 0 }, rotation: 270 },
        { instanceId: "s-2", location: "board", cell: { row: 0, col: 1 }, rotation: 90 },
      ];
      const res = evaluate(engPack, exactProblem, pieces, 10);
      expect(res.status).toBe("correct");
    });

    it("J05: 불일치하는 회전(0도, 90도)이면 incorrect (RULE_NOT_MET)", () => {
      const pieces: PieceState[] = [
        { instanceId: "s-1", location: "board", cell: { row: 0, col: 0 }, rotation: 0 },
        { instanceId: "s-2", location: "board", cell: { row: 0, col: 1 }, rotation: 90 },
      ];
      const res = evaluate(engPack, exactProblem, pieces, 11);
      expect(res.status).toBe("incorrect");
      expect(res.code).toBe("RULE_NOT_MET");
    });
  });

  describe("2-3 Requirements 검사 순서 (J14)", () => {
    it("placed > maxPlaced -> incorrect TOO_MANY", () => {
      const pieces: PieceState[] = (demo01SolRaw.pieces as PieceState[]).map((p) => p);
      const reqProblem: Problem = {
        ...demoProblem,
        requirements: {
          ...demoProblem.requirements,
          maxPlaced: 4, // 5개 놓았는데 maxPlaced가 4
        },
      };
      const res = evaluate(demoPack, reqProblem, pieces, 12);
      expect(res.status).toBe("incorrect");
      expect(res.code).toBe("TOO_MANY");
    });

    it("emptyCells 점유 -> incorrect EMPTY_CELL_USED", () => {
      const pieces = demo01SolRaw.pieces as PieceState[];
      const reqProblem: Problem = {
        ...demoProblem,
        requirements: {
          ...demoProblem.requirements,
          emptyCells: [{ row: 2, col: 2 }],
        },
      };
      const res = evaluate(demoPack, reqProblem, pieces, 13);
      expect(res.status).toBe("incorrect");
      expect(res.code).toBe("EMPTY_CELL_USED");
    });

    it("타입별 count 초과 -> incorrect TOO_MANY_TYPE", () => {
      const pieces = demo01SolRaw.pieces as PieceState[];
      const reqProblem: Problem = {
        ...demoProblem,
        requirements: {
          ...demoProblem.requirements,
          requiredTypeCounts: [{ judgeKey: "straight-blue", count: 4 }],
        },
      };
      const res = evaluate(demoPack, reqProblem, pieces, 14);
      expect(res.status).toBe("incorrect");
      expect(res.code).toBe("TOO_MANY_TYPE");
    });

    it("placed < minPlaced -> incomplete MISSING_REQUIRED", () => {
      // 5개 중 4개만 놓고 1개는 tray
      const pieces: PieceState[] = (demo01SolRaw.pieces as PieceState[]).map((p) =>
        p.instanceId === "line-05" ? { instanceId: "line-05", location: "tray", rotation: 0 } : p,
      );
      const res = evaluate(demoPack, demoProblem, pieces, 15);
      expect(res.status).toBe("incomplete");
      expect(res.code).toBe("MISSING_REQUIRED");
    });

    it("requiredCells 미점유 -> incomplete REQUIRED_CELL_EMPTY", () => {
      // 5개 놓았지만 requiredCell인 (2,4)를 비우고 (1,4)에 배치
      const pieces: PieceState[] = (demo01SolRaw.pieces as PieceState[]).map((p) =>
        p.instanceId === "line-05"
          ? { instanceId: "line-05", location: "board", cell: { row: 1, col: 4 }, rotation: 0 }
          : p,
      );
      const res = evaluate(demoPack, demoProblem, pieces, 16);
      expect(res.status).toBe("incomplete");
      expect(res.code).toBe("REQUIRED_CELL_EMPTY");
    });

    it("초과(TOO_MANY)와 미달(REQUIRED_CELL_EMPTY)이 동시 발생 시 incorrect가 우선", () => {
      // maxPlaced를 4로 줄이고, requiredCell (2,4)도 비워둠
      const pieces: PieceState[] = (demo01SolRaw.pieces as PieceState[]).map((p) =>
        p.instanceId === "line-05"
          ? { instanceId: "line-05", location: "board", cell: { row: 1, col: 4 }, rotation: 0 }
          : p,
      );
      const reqProblem: Problem = {
        ...demoProblem,
        requirements: {
          ...demoProblem.requirements,
          maxPlaced: 4,
        },
      };
      const res = evaluate(demoPack, reqProblem, pieces, 17);
      expect(res.status).toBe("incorrect");
      expect(res.code).toBe("TOO_MANY");
    });
  });
});
