import { describe, expect, it } from "vitest";
import devPackJson from "@/content/packs/engineering-demo.json";
import { validateContent } from "@/domain/content/validateContent";
import type { ContentPack, Rotation } from "@/domain/types";

describe("validateContent", () => {
  it("개발용 팩(engineering-demo.json)을 올바르게 검증하고 인덱싱한다", () => {
    const result = validateContent(devPackJson);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.pack.problems).toHaveLength(15);
    expect(result.pack.orderedProblems[0]?.id).toBe("p-001");
    expect(result.pack.contentVersion).toBe("1.0.0");
    expect(result.pack.schemaVersion).toBe(1);

    // p-001의 인스턴스 라벨 번호 부여 확인 (1부터 순번)
    const p1Labels = result.pack.instanceLabel["p-001"];
    expect(p1Labels).toBeDefined();
    expect(p1Labels?.["line-1"]).toBe(1);
    expect(p1Labels?.["line-5"]).toBe(5);
  });

  it("상세서 11.2의 예시 문제(demo-001)를 정상 통과시킨다", () => {
    const demo112: ContentPack = {
      schemaVersion: 1,
      packId: "engineering-demo",
      contentVersion: "1.0.0",
      purpose: "development",
      title: "연결 엔진 검증용",
      pieceTypes: [
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
      ],
      problems: [
        {
          id: "demo-001",
          order: 1,
          title: "두 끝을 이어 보세요",
          prompt: ["파란 직선 조각 5개를 모두 사용해요.", "왼쪽과 오른쪽의 파란 끝을 이어 주세요."],
          pattern: {
            asset: "assets/patterns/demo-001.svg",
            alt: "5×5 보드의 3행 왼쪽과 오른쪽 경계에 파란 끝점이 있어요.",
            description:
              "파란 끝점은 3행 1열의 왼쪽과 3행 5열의 오른쪽에 있어요. 두 끝점을 연결해요.",
          },
          board: { rows: 5, cols: 5, blockedCells: [] },
          pieces: [
            { id: "line-01", typeId: "straight-blue", locked: false },
            { id: "line-02", typeId: "straight-blue", locked: false },
            { id: "line-03", typeId: "straight-blue", locked: false },
            { id: "line-04", typeId: "straight-blue", locked: false },
            { id: "line-05", typeId: "straight-blue", locked: false },
          ],
          initialPieces: [
            { instanceId: "line-01", location: "tray", rotation: 0 },
            { instanceId: "line-02", location: "tray", rotation: 0 },
            { instanceId: "line-03", location: "tray", rotation: 0 },
            { instanceId: "line-04", location: "tray", rotation: 0 },
            { instanceId: "line-05", location: "tray", rotation: 0 },
          ],
          requirements: {
            minPlaced: 5,
            maxPlaced: 5,
            requireAllMovablePieces: true,
            requiredCells: [
              { row: 2, col: 0 },
              { row: 2, col: 4 },
            ],
            emptyCells: [],
            requiredTypeCounts: [{ judgeKey: "straight-blue", count: 5 }],
          },
          judge: {
            mode: "connection",
            terminals: [
              { id: "start", cell: { row: 2, col: 0 }, side: "W", channel: "blue" },
              { id: "finish", cell: { row: 2, col: 4 }, side: "E", channel: "blue" },
            ],
            requiredPairs: [["start", "finish"]],
            forbiddenPairs: [],
            allowDanglingPorts: false,
            allowCycles: false,
            allowBranches: false,
            allowDisconnectedComponents: false,
          },
        },
      ],
    };

    const res = validateContent(demo112);
    expect(res.ok).toBe(true);
  });

  describe("검증 규칙별 오류 검출 (R-ID ~ R-SOL, J19)", () => {
    const clonePack = (): ContentPack => JSON.parse(JSON.stringify(devPackJson));

    it("R-SCHEMA: schemaVersion != 1 이면 거부", () => {
      const p = clonePack();
      (p as { schemaVersion: number }).schemaVersion = 2;
      const res = validateContent(p);
      expect(res.ok).toBe(false);
      if (!res.ok)
        expect(res.errors.some((e) => e.code === "CONTENT_UNSUPPORTED_VERSION")).toBe(true);
    });

    it("R-VER: semver 형식 아닐 때 거부", () => {
      const p = clonePack();
      p.contentVersion = "v1-invalid";
      const res = validateContent(p);
      expect(res.ok).toBe(false);
      if (!res.ok)
        expect(
          res.errors.some((e) => e.code === "CONTENT_INVALID" && e.path === "contentVersion"),
        ).toBe(true);
    });

    it("R-COUNT: release 모드에서 문제 수 10개 미만이면 거부", () => {
      const p = clonePack();
      p.purpose = "release";
      p.problems = p.problems.slice(0, 5); // 5문제
      const res = validateContent(p);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.errors.some((e) => e.code === "CONTENT_INVALID_COUNT")).toBe(true);
    });

    it("R-ROT: allowedRotations에 잘못된 각도가 있거나 중복 분할이 안 된 경우", () => {
      const p = clonePack();
      p.pieceTypes[0]!.allowedRotations = [0, 45 as unknown as Rotation];
      const res = validateContent(p);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.errors.some((e) => e.code === "CONTENT_INVALID_ROTATION")).toBe(true);
    });

    it("R-FIXED: locked 조각이 initialPieces에서 tray에 있으면 거부", () => {
      const p = clonePack();
      // p-009의 첫 조각이 locked인데 tray에 둠
      p.problems[8]!.initialPieces[0] = {
        instanceId: p.problems[8]!.pieces[0]!.id,
        location: "tray",
        rotation: 0,
      };
      const res = validateContent(p);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.errors.some((e) => e.code === "CONTENT_INVALID_FIXED")).toBe(true);
    });

    it("J19: 모순 수량 (minPlaced > maxPlaced) 거부", () => {
      const p = clonePack();
      p.problems[0]!.requirements.minPlaced = 10;
      p.problems[0]!.requirements.maxPlaced = 5;
      const res = validateContent(p);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.errors.some((e) => e.code === "CONTENT_INVALID_RULE")).toBe(true);
    });

    it("J19: 동일 judgeKey를 가지는 조각들의 회전 규격이 다르면 거부", () => {
      const p = clonePack();
      p.pieceTypes.push({
        id: "straight-variant",
        judgeKey: "straight-blue", // 동일한 judgeKey
        name: "변형 직선",
        asset: "assets/pieces/straight-variant.svg",
        allowedRotations: [0, 90], // 기존 [0, 90, 180, 270]과 불일치
        equivalentRotations: [[0], [90]],
      });
      const res = validateContent(p);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.errors.some((e) => e.code === "CONTENT_INVALID_ROTATION")).toBe(true);
    });

    it("R-PAIR: 필수 연결 쌍과 금지 연결 쌍이 충돌하면 거부", () => {
      const p = clonePack();
      const prob = p.problems[0]!;
      if (prob.judge.mode === "connection") {
        prob.judge.forbiddenPairs = [["start", "finish"]]; // requiredPairs와 동일
      }
      const res = validateContent(p);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.errors.some((e) => e.code === "CONTENT_INVALID_RULE")).toBe(true);
    });

    it("R-SOL: exact 모드에서 금지칸에 조각이 놓여있으면 거부", () => {
      const p = clonePack();
      const prob = p.problems[2]!; // p-003 (exact)
      prob.board.blockedCells = [{ row: 0, col: 2 }]; // 0,2 칸 금지
      const res = validateContent(p);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.errors.some((e) => e.code === "CONTENT_INVALID_SOLUTION")).toBe(true);
    });

    it("R-START: 초기 배치가 이미 정답(correct)인 문제 거부", () => {
      const p = clonePack();
      // p-001을 정답 상태로 초기 배치 설정
      // p-001은 (2,0)에서 (2,4)까지 5개 직선이 0도 회전으로 배치되면 정답
      p.problems[0]!.initialPieces = [
        { instanceId: "line-1", location: "board", cell: { row: 2, col: 0 }, rotation: 0 },
        { instanceId: "line-2", location: "board", cell: { row: 2, col: 1 }, rotation: 0 },
        { instanceId: "line-3", location: "board", cell: { row: 2, col: 2 }, rotation: 0 },
        { instanceId: "line-4", location: "board", cell: { row: 2, col: 3 }, rotation: 0 },
        { instanceId: "line-5", location: "board", cell: { row: 2, col: 4 }, rotation: 0 },
      ];
      const res = validateContent(p);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(
          res.errors.some(
            (e) => e.code === "CONTENT_INVALID_RULE" && e.path.includes("initialPieces"),
          ),
        ).toBe(true);
      }
    });
  });
});
