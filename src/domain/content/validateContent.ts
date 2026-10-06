import { z } from "zod";
import { evaluate } from "../judge/evaluate";
import type {
  Cell,
  ContentErrorCode,
  ContentIssue,
  ContentPack,
  ExactJudge,
  PieceInstance,
  PieceState,
  PieceType,
  Problem,
  ResolvedPack,
  Rotation,
  Side,
  Topology,
} from "../types";

const ID_REGEX = /^[a-z0-9][a-z0-9-]{0,39}$/;
const VERSION_REGEX = /^\d+\.\d+\.\d+$/;

const unicodeLength = (str: string): number => [...str.normalize("NFC")].length;

export type ValidationResult =
  { ok: true; pack: ResolvedPack } | { ok: false; errors: ContentIssue[] };

// Zod 기본 1차 스키마
const rotationSchema = z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]);
const sideSchema = z.enum(["N", "E", "S", "W"]);
const cellSchema = z.object({
  row: z.number().int().min(0).max(4),
  col: z.number().int().min(0).max(4),
});

export interface ValidationOptions {
  lenient?: boolean;
}

export const validateContent = (raw: unknown, options?: ValidationOptions): ValidationResult => {
  const errors: ContentIssue[] = [];
  const addError = (code: ContentErrorCode, path: string, message?: string, problemId?: string) => {
    errors.push({ code, path, message, problemId });
  };

  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      errors: [{ code: "CONTENT_INVALID", path: "root", message: "JSON 객체여야 합니다." }],
    };
  }

  const packObj = raw as Partial<ContentPack>;

  // R-SCHEMA
  if (packObj.schemaVersion !== 1) {
    addError("CONTENT_UNSUPPORTED_VERSION", "schemaVersion", "schemaVersion은 1이어야 합니다.");
  }

  // R-ID: packId
  if (!packObj.packId || !ID_REGEX.test(packObj.packId)) {
    addError("CONTENT_INVALID", "packId", "유효한 packId 형식이 아닙니다.");
  }

  // R-VER: contentVersion
  if (!packObj.contentVersion || !VERSION_REGEX.test(packObj.contentVersion)) {
    addError(
      "CONTENT_INVALID",
      "contentVersion",
      "contentVersion은 유효한 세 자리 버전이어야 합니다.",
    );
  }

  // purpose
  const purpose = packObj.purpose;
  if (purpose !== "development" && purpose !== "release") {
    addError("CONTENT_INVALID", "purpose", "purpose는 development 또는 release여야 합니다.");
  }

  // title
  if (!packObj.title || typeof packObj.title !== "string") {
    addError("CONTENT_INVALID", "title", "title이 누락되었습니다.");
  }

  // pieceTypes 검증
  const pieceTypes = packObj.pieceTypes;
  const typeById: Record<string, PieceType> = {};
  const typesByJudgeKey: Record<string, PieceType[]> = {};

  if (!Array.isArray(pieceTypes) || pieceTypes.length === 0) {
    addError("CONTENT_INVALID", "pieceTypes", "pieceTypes가 비어있습니다.");
  } else {
    for (let i = 0; i < pieceTypes.length; i++) {
      const pt = pieceTypes[i] as PieceType;
      const tPath = `pieceTypes[${i}]`;

      if (!pt.id || !ID_REGEX.test(pt.id)) {
        addError("CONTENT_INVALID", `${tPath}.id`, "유효하지 않은 type ID입니다.");
      } else if (typeById[pt.id]) {
        addError("CONTENT_INVALID", `${tPath}.id`, `중복된 type ID: ${pt.id}`);
      } else {
        typeById[pt.id] = pt;
      }

      if (!pt.judgeKey || !ID_REGEX.test(pt.judgeKey)) {
        addError("CONTENT_INVALID", `${tPath}.judgeKey`, "유효하지 않은 judgeKey입니다.");
      } else {
        if (!typesByJudgeKey[pt.judgeKey]) typesByJudgeKey[pt.judgeKey] = [];
        typesByJudgeKey[pt.judgeKey].push(pt);
      }

      // R-ASSET
      if (pt.asset) {
        if (!pt.asset.startsWith("assets/") || pt.asset.includes("..") || pt.asset.includes(":")) {
          addError("CONTENT_INVALID", `${tPath}.asset`, "유효하지 않은 자산 경로입니다.");
        }
      }

      // R-ROT
      if (!Array.isArray(pt.allowedRotations) || pt.allowedRotations.length === 0) {
        addError(
          "CONTENT_INVALID_ROTATION",
          `${tPath}.allowedRotations`,
          "allowedRotations가 비어있습니다.",
        );
      } else {
        const allowedSet = new Set(pt.allowedRotations);
        if (allowedSet.size !== pt.allowedRotations.length) {
          addError(
            "CONTENT_INVALID_ROTATION",
            `${tPath}.allowedRotations`,
            "allowedRotations에 중복이 있습니다.",
          );
        }
        for (const rot of pt.allowedRotations) {
          if (![0, 90, 180, 270].includes(rot)) {
            addError(
              "CONTENT_INVALID_ROTATION",
              `${tPath}.allowedRotations`,
              "회전 각도는 0, 90, 180, 270 중 하나여야 합니다.",
            );
          }
        }

        // equivalentRotations 분할 검증
        if (!Array.isArray(pt.equivalentRotations)) {
          addError(
            "CONTENT_INVALID_ROTATION",
            `${tPath}.equivalentRotations`,
            "equivalentRotations 배열이 필요합니다.",
          );
        } else {
          const eqRotationsFlat = pt.equivalentRotations.flat();
          const eqSet = new Set(eqRotationsFlat);
          if (
            eqSet.size !== eqRotationsFlat.length ||
            eqSet.size !== allowedSet.size ||
            ![...allowedSet].every((r) => eqSet.has(r))
          ) {
            addError(
              "CONTENT_INVALID_ROTATION",
              `${tPath}.equivalentRotations`,
              "equivalentRotations는 allowedRotations를 정확히 1회 분할해야 합니다.",
            );
          }
        }
      }

      // R-TOPO
      if (pt.topology) {
        const topo = pt.topology;
        const nodeIds = new Set<string>();

        if (Array.isArray(topo.ports)) {
          const portSides = new Set<Side>();
          for (const port of topo.ports) {
            if (!port.id || nodeIds.has(port.id)) {
              addError(
                "CONTENT_INVALID_TOPOLOGY",
                `${tPath}.topology.ports`,
                "포트 ID가 유일하지 않습니다.",
              );
            }
            nodeIds.add(port.id);
            if (portSides.has(port.side)) {
              addError(
                "CONTENT_INVALID_TOPOLOGY",
                `${tPath}.topology.ports`,
                "한 면에는 최대 1개의 포트만 올 수 있습니다.",
              );
            }
            portSides.add(port.side);
          }
        }

        if (Array.isArray(topo.internalNodes)) {
          for (const nid of topo.internalNodes) {
            if (nodeIds.has(nid)) {
              addError(
                "CONTENT_INVALID_TOPOLOGY",
                `${tPath}.topology.internalNodes`,
                `중복 노드 ID: ${nid}`,
              );
            }
            nodeIds.add(nid);
          }
        }

        if (Array.isArray(topo.internalEdges)) {
          const edgeSet = new Set<string>();
          for (const edge of topo.internalEdges) {
            if (!Array.isArray(edge) || edge.length !== 2) {
              addError(
                "CONTENT_INVALID_TOPOLOGY",
                `${tPath}.topology.internalEdges`,
                "간선 형식이 잘못되었습니다.",
              );
              continue;
            }
            const [u, v] = edge;
            if (!nodeIds.has(u) || !nodeIds.has(v)) {
              addError(
                "CONTENT_INVALID_TOPOLOGY",
                `${tPath}.topology.internalEdges`,
                `존재하지 않는 노드 참조: ${u}, ${v}`,
              );
            }
            if (u === v) {
              addError(
                "CONTENT_INVALID_TOPOLOGY",
                `${tPath}.topology.internalEdges`,
                "자기 자신으로의 간선은 금지됩니다.",
              );
            }
            const edgeKey = u < v ? `${u}|${v}` : `${v}|${u}`;
            if (edgeSet.has(edgeKey)) {
              addError(
                "CONTENT_INVALID_TOPOLOGY",
                `${tPath}.topology.internalEdges`,
                "중복 간선이 있습니다.",
              );
            }
            edgeSet.add(edgeKey);
          }
        }
      }
    }

    // 같은 judgeKey 간 회전 규칙 일치 검사
    for (const [jk, list] of Object.entries(typesByJudgeKey)) {
      if (list.length > 1) {
        const firstAllowed = JSON.stringify(list[0]?.allowedRotations);
        const firstEq = JSON.stringify(list[0]?.equivalentRotations);
        for (let j = 1; j < list.length; j++) {
          if (
            JSON.stringify(list[j]?.allowedRotations) !== firstAllowed ||
            JSON.stringify(list[j]?.equivalentRotations) !== firstEq
          ) {
            addError(
              "CONTENT_INVALID_ROTATION",
              `judgeKey[${jk}]`,
              "동일한 judgeKey의 조각들은 회전 규칙이 일치해야 합니다.",
            );
          }
        }
      }
    }
  }

  // problems 검증
  const problems = packObj.problems;
  const problemById: Record<string, Problem> = {};
  const invalidProblems: Record<string, ContentIssue[]> = {};
  const instanceLabel: Record<string, Record<string, number>> = {};

  if (!Array.isArray(problems) || problems.length === 0) {
    addError("CONTENT_INVALID", "problems", "problems가 비어있습니다.");
  } else {
    // R-COUNT
    const minProblems = 1;
    const maxProblems = 20;
    if (problems.length < minProblems || problems.length > maxProblems) {
      addError(
        "CONTENT_INVALID_COUNT",
        "problems.length",
        `문제 수는 ${minProblems}~${maxProblems}개여야 합니다.`,
      );
    }
    if (purpose === "release" && (problems.length < 10 || problems.length > 20)) {
      addError(
        "CONTENT_INVALID_COUNT",
        "problems.length",
        "release 팩의 문제 수는 10~20개여야 합니다.",
      );
    }

    const seenOrders = new Set<number>();

    for (let pIdx = 0; pIdx < problems.length; pIdx++) {
      const prob = problems[pIdx] as Problem;
      const pPath = `problems[${pIdx}]`;
      const pId = prob.id || `unknown-${pIdx}`;
      const probErrors: ContentIssue[] = [];
      const addProbError = (code: ContentErrorCode, subPath: string, message?: string) => {
        const issue = { code, path: `${pPath}.${subPath}`, message, problemId: pId };
        errors.push(issue);
        probErrors.push(issue);
      };

      // R-ID: problemId
      if (!prob.id || !ID_REGEX.test(prob.id)) {
        addProbError("CONTENT_INVALID", "id", "유효하지 않은 문제 ID입니다.");
      } else if (problemById[prob.id]) {
        addProbError("CONTENT_INVALID", "id", `중복된 문제 ID: ${prob.id}`);
      }

      // R-ORDER
      if (typeof prob.order !== "number" || !Number.isInteger(prob.order) || prob.order < 1) {
        addProbError("CONTENT_INVALID_ORDER", "order", "order는 1 이상의 정수여야 합니다.");
      } else {
        if (seenOrders.has(prob.order)) {
          addProbError("CONTENT_INVALID_ORDER", "order", `중복된 order: ${prob.order}`);
        }
        seenOrders.add(prob.order);
      }

      // R-TEXT: title
      if (
        !prob.title ||
        typeof prob.title !== "string" ||
        unicodeLength(prob.title.trim()) < 1 ||
        unicodeLength(prob.title.trim()) > 30
      ) {
        addProbError("CONTENT_INVALID", "title", "제목은 1~30자여야 합니다.");
      }

      // R-TEXT: prompt
      if (!Array.isArray(prob.prompt) || prob.prompt.length < 1 || prob.prompt.length > 3) {
        addProbError("CONTENT_INVALID", "prompt", "조건(prompt)은 1~3개 문장이어야 합니다.");
      } else {
        for (let prIdx = 0; prIdx < prob.prompt.length; prIdx++) {
          const pr = prob.prompt[prIdx];
          if (
            typeof pr !== "string" ||
            unicodeLength(pr.trim()) < 1 ||
            unicodeLength(pr.trim()) > 30
          ) {
            addProbError("CONTENT_INVALID", `prompt[${prIdx}]`, "각 조건은 1~30자여야 합니다.");
          }
        }
      }

      // R-TEXT & R-ASSET: pattern
      if (!prob.pattern || typeof prob.pattern !== "object") {
        addProbError("CONTENT_INVALID", "pattern", "도안 정보가 누락되었습니다.");
      } else {
        if (
          !prob.pattern.alt ||
          unicodeLength(prob.pattern.alt) < 1 ||
          unicodeLength(prob.pattern.alt) > 200
        ) {
          addProbError("CONTENT_INVALID", "pattern.alt", "도안 대체 텍스트는 1~200자여야 합니다.");
        }
        if (
          !prob.pattern.description ||
          unicodeLength(prob.pattern.description) < 1 ||
          unicodeLength(prob.pattern.description) > 1000
        ) {
          addProbError(
            "CONTENT_INVALID",
            "pattern.description",
            "도안 설명은 1~1000자여야 합니다.",
          );
        }
        if (purpose === "release" && !prob.pattern.asset) {
          addProbError(
            "CONTENT_INVALID",
            "pattern.asset",
            "release 문제에서는 pattern.asset이 필수입니다.",
          );
        }
        if (
          prob.pattern.asset &&
          (!prob.pattern.asset.startsWith("assets/") ||
            prob.pattern.asset.includes("..") ||
            prob.pattern.asset.includes(":"))
        ) {
          addProbError(
            "CONTENT_INVALID",
            "pattern.asset",
            "유효하지 않은 pattern.asset 경로입니다.",
          );
        }
      }

      // board
      const blockedCells = prob.board?.blockedCells || [];
      const blockedSet = new Set<string>();
      for (const bc of blockedCells) {
        const k = `${bc.row},${bc.col}`;
        if (bc.row < 0 || bc.row > 4 || bc.col < 0 || bc.col > 4) {
          addProbError("CONTENT_INVALID_RULE", "board.blockedCells", "금지칸 좌표 범위 오류(0~4)");
        }
        if (blockedSet.has(k)) {
          addProbError("CONTENT_INVALID_RULE", "board.blockedCells", `중복된 금지칸: ${k}`);
        }
        blockedSet.add(k);
      }

      // pieces & initialPieces
      const pieces = prob.pieces || [];
      const initialPieces = prob.initialPieces || [];
      const instMap = new Map<string, PieceInstance>();
      instanceLabel[pId] = {};

      if (!Array.isArray(pieces) || pieces.length < 1 || pieces.length > 25) {
        addProbError("CONTENT_INVALID", "pieces", "조각 수는 1~25개여야 합니다.");
      } else {
        for (let pcIdx = 0; pcIdx < pieces.length; pcIdx++) {
          const pc = pieces[pcIdx] as PieceInstance;
          if (!pc.id || !ID_REGEX.test(pc.id)) {
            addProbError(
              "CONTENT_INVALID",
              `pieces[${pcIdx}].id`,
              "유효하지 않은 조각 인스턴스 ID",
            );
          } else if (instMap.has(pc.id)) {
            addProbError(
              "CONTENT_INVALID",
              `pieces[${pcIdx}].id`,
              `중복 조각 인스턴스 ID: ${pc.id}`,
            );
          } else {
            instMap.set(pc.id, pc);
            instanceLabel[pId][pc.id] = pcIdx + 1; // 1부터 순번 부여
          }

          if (!pc.typeId || !typeById[pc.typeId]) {
            addProbError(
              "CONTENT_INVALID",
              `pieces[${pcIdx}].typeId`,
              `존재하지 않는 조각 종류: ${pc.typeId}`,
            );
          }
        }
      }

      // R-PIECES & R-FIXED
      if (!Array.isArray(initialPieces) || initialPieces.length !== instMap.size) {
        addProbError(
          "CONTENT_INVALID",
          "initialPieces",
          "initialPieces 길이는 pieces 길이와 같아야 합니다.",
        );
      } else {
        const seenInitialInsts = new Set<string>();
        const initialBoardOccupied = new Set<string>();

        for (let ipIdx = 0; ipIdx < initialPieces.length; ipIdx++) {
          const ip = initialPieces[ipIdx] as PieceState;
          if (!ip.instanceId || !instMap.has(ip.instanceId)) {
            addProbError(
              "CONTENT_INVALID",
              `initialPieces[${ipIdx}]`,
              "존재하지 않는 조각 인스턴스 ID 참조",
            );
            continue;
          }
          if (seenInitialInsts.has(ip.instanceId)) {
            addProbError(
              "CONTENT_INVALID",
              `initialPieces[${ipIdx}]`,
              `중복된 인스턴스 초기 상태: ${ip.instanceId}`,
            );
          }
          seenInitialInsts.add(ip.instanceId);

          const inst = instMap.get(ip.instanceId)!;
          const pType = typeById[inst.typeId];

          if (pType && !pType.allowedRotations.includes(ip.rotation)) {
            addProbError(
              "CONTENT_INVALID_ROTATION",
              `initialPieces[${ipIdx}].rotation`,
              "허용되지 않는 초기 회전값",
            );
          }

          if (ip.location === "board") {
            const { row, col } = ip.cell;
            const cellKey = `${row},${col}`;
            if (row < 0 || row > 4 || col < 0 || col > 4) {
              addProbError(
                "CONTENT_INVALID",
                `initialPieces[${ipIdx}].cell`,
                "보드 좌표 범위 오류",
              );
            }
            if (blockedSet.has(cellKey)) {
              addProbError(
                "CONTENT_INVALID_RULE",
                `initialPieces[${ipIdx}].cell`,
                "금지칸에 초기 배치할 수 없습니다.",
              );
            }
            if (initialBoardOccupied.has(cellKey)) {
              addProbError(
                "CONTENT_INVALID",
                `initialPieces[${ipIdx}].cell`,
                "초기 보드 점유 중복",
              );
            }
            initialBoardOccupied.add(cellKey);
          }

          // R-FIXED: locked 조각은 initialPieces에서 board 위치여야 함
          if (inst.locked && ip.location !== "board") {
            addProbError(
              "CONTENT_INVALID_FIXED",
              `initialPieces[${ipIdx}]`,
              "고정 조각(locked)은 초기에 board에 배치되어야 합니다.",
            );
          }
        }
      }

      // R-REQ
      const req = prob.requirements;
      const availableCells = 25 - blockedSet.size;
      if (!req || typeof req !== "object") {
        addProbError("CONTENT_INVALID_RULE", "requirements", "requirements 누락");
      } else {
        if (
          req.minPlaced < 1 ||
          req.maxPlaced < req.minPlaced ||
          req.maxPlaced > Math.min(instMap.size, availableCells)
        ) {
          addProbError(
            "CONTENT_INVALID_RULE",
            "requirements.placedCount",
            "minPlaced / maxPlaced 범위 모순",
          );
        }

        // R-CELLS
        const reqCells = req.requiredCells || [];
        const emptyCells = req.emptyCells || [];
        const reqCellSet = new Set<string>();
        const emptyCellSet = new Set<string>();

        for (const c of reqCells) {
          const k = `${c.row},${c.col}`;
          if (
            c.row < 0 ||
            c.row > 4 ||
            c.col < 0 ||
            c.col > 4 ||
            blockedSet.has(k) ||
            reqCellSet.has(k)
          ) {
            addProbError(
              "CONTENT_INVALID_RULE",
              "requirements.requiredCells",
              "requiredCells 좌표 오류 또는 모순",
            );
          }
          reqCellSet.add(k);
        }

        for (const c of emptyCells) {
          const k = `${c.row},${c.col}`;
          if (
            c.row < 0 ||
            c.row > 4 ||
            c.col < 0 ||
            c.col > 4 ||
            reqCellSet.has(k) ||
            blockedSet.has(k) ||
            emptyCellSet.has(k)
          ) {
            addProbError(
              "CONTENT_INVALID_RULE",
              "requirements.emptyCells",
              "emptyCells 좌표 오류 또는 모순",
            );
          }
          emptyCellSet.add(k);
        }

        if (Array.isArray(req.requiredTypeCounts)) {
          for (const tc of req.requiredTypeCounts) {
            if (!typesByJudgeKey[tc.judgeKey]) {
              addProbError(
                "CONTENT_INVALID_RULE",
                "requirements.requiredTypeCounts",
                `존재하지 않는 judgeKey: ${tc.judgeKey}`,
              );
            }
          }
        }
      }

      // judge 검증
      const judge = prob.judge;
      if (!judge || typeof judge !== "object") {
        addProbError("CONTENT_INVALID_RULE", "judge", "judge 객체 누락");
      } else if (judge.mode === "exact") {
        const exactJudge = judge as ExactJudge;
        if (!Array.isArray(exactJudge.solutions) || exactJudge.solutions.length === 0) {
          addProbError(
            "CONTENT_INVALID_SOLUTION",
            "judge.solutions",
            "exact 모드는 1개 이상의 solution이 필요합니다.",
          );
        } else {
          for (let sIdx = 0; sIdx < exactJudge.solutions.length; sIdx++) {
            const sol = exactJudge.solutions[sIdx];
            if (!Array.isArray(sol) || sol.length !== 25) {
              addProbError(
                "CONTENT_INVALID_SOLUTION",
                `judge.solutions[${sIdx}]`,
                "solution은 25칸 배열이어야 합니다.",
              );
              continue;
            }
            let movableUsed = 0;
            for (let idx = 0; idx < 25; idx++) {
              const cellVal = sol[idx];
              const r = Math.floor(idx / 5);
              const c = idx % 5;
              const k = `${r},${c}`;
              if (blockedSet.has(k) && cellVal !== null) {
                addProbError(
                  "CONTENT_INVALID_SOLUTION",
                  `judge.solutions[${sIdx}][${idx}]`,
                  "금지칸은 정답에서 null이어야 합니다.",
                );
              }
              if (cellVal !== null) {
                if (!typesByJudgeKey[cellVal.judgeKey]) {
                  addProbError(
                    "CONTENT_INVALID_SOLUTION",
                    `judge.solutions[${sIdx}][${idx}]`,
                    `존재하지 않는 judgeKey: ${cellVal.judgeKey}`,
                  );
                }
                movableUsed++;
              }
            }
            if (movableUsed === 0) {
              addProbError(
                "CONTENT_INVALID_SOLUTION",
                `judge.solutions[${sIdx}]`,
                "정답에 최소 1개 이상의 조각이 배치되어야 합니다.",
              );
            }
          }
        }
      } else if (judge.mode === "connection") {
        // connection 문제의 타입들에 topology 필수
        for (const inst of instMap.values()) {
          const pt = typeById[inst.typeId];
          if (pt && !pt.topology) {
            addProbError(
              "CONTENT_INVALID_TOPOLOGY",
              `judge.connection`,
              `연결 모드에서 사용하는 타입 ${pt.id}에 topology가 없습니다.`,
            );
          }
        }

        // R-TERM: terminals 검증
        const termIds = new Set<string>();
        const termPositions = new Set<string>();
        const terminals = judge.terminals || [];

        for (const t of terminals) {
          if (!t.id || termIds.has(t.id)) {
            addProbError(
              "CONTENT_INVALID_TERMINAL",
              "judge.terminals",
              `유효하지 않거나 중복된 terminal ID: ${t.id}`,
            );
          }
          termIds.add(t.id);

          const posKey = `${t.cell.row},${t.cell.col}:${t.side}`;
          if (termPositions.has(posKey)) {
            addProbError(
              "CONTENT_INVALID_TERMINAL",
              "judge.terminals",
              `동일 위치/면에 복수 terminal: ${posKey}`,
            );
          }
          termPositions.add(posKey);

          // terminal은 보드 경계 칸의 바깥 면이어야 함
          const isBoundary =
            (t.side === "N" && t.cell.row === 0) ||
            (t.side === "S" && t.cell.row === 4) ||
            (t.side === "W" && t.cell.col === 0) ||
            (t.side === "E" && t.cell.col === 4);
          if (!isBoundary) {
            addProbError(
              "CONTENT_INVALID_TERMINAL",
              `judge.terminals[${t.id}]`,
              "terminal은 보드 경계의 바깥 면이어야 합니다.",
            );
          }
        }

        // R-PAIR: requiredPairs & forbiddenPairs
        const reqPairs = judge.requiredPairs || [];
        const forbPairs = judge.forbiddenPairs || [];

        for (const [a, b] of reqPairs) {
          if (!termIds.has(a) || !termIds.has(b) || a === b) {
            addProbError(
              "CONTENT_INVALID_RULE",
              "judge.requiredPairs",
              `유효하지 않은 쌍: ${a}, ${b}`,
            );
          }
        }

        for (const [a, b] of forbPairs) {
          if (!termIds.has(a) || !termIds.has(b) || a === b) {
            addProbError(
              "CONTENT_INVALID_RULE",
              "judge.forbiddenPairs",
              `유효하지 않은 금지 쌍: ${a}, ${b}`,
            );
          }
          // requiredPairs와의 충돌 검사
          const hasConflict = reqPairs.some(
            ([ra, rb]) => (ra === a && rb === b) || (ra === b && rb === a),
          );
          if (hasConflict) {
            addProbError(
              "CONTENT_INVALID_RULE",
              "judge.pairs",
              `필수 쌍과 금지 쌍이 충돌합니다: ${a}, ${b}`,
            );
          }
        }
      } else {
        addProbError("CONTENT_INVALID_RULE", "judge.mode", "지원하지 않는 판정 모드입니다.");
      }

      // R-START: 초기 배치가 이미 정답(correct)인 문제 거부
      if (probErrors.length === 0) {
        const dummyPack: ResolvedPack = {
          schemaVersion: 1,
          packId: packObj.packId || "check",
          contentVersion: packObj.contentVersion || "1.0.0",
          purpose: purpose || "development",
          title: packObj.title || "",
          pieceTypes: packObj.pieceTypes || [],
          problems: [prob],
          typeById,
          problemById: { [prob.id]: prob },
          orderedProblems: [prob],
          instanceLabel: { [prob.id]: {} },
        };
        const initResult = evaluate(dummyPack, prob, prob.initialPieces, 0);
        if (initResult.status === "correct") {
          addProbError(
            "CONTENT_INVALID_RULE",
            "initialPieces",
            "초기 배치가 이미 정답 상태입니다.",
          );
        }
      }

      if (probErrors.length > 0) {
        invalidProblems[pId] = probErrors;
      } else {
        problemById[pId] = prob;
      }
    }

    // R-ORDER: 누락 확인 (1..N)
    for (let ord = 1; ord <= problems.length; ord++) {
      if (!seenOrders.has(ord)) {
        addError("CONTENT_INVALID_ORDER", "problems.order", `누락된 order 번호: ${ord}`);
      }
    }
  }

  // 오류가 있는 경우 기본적으로 전체 검증 실패 (lenient 모드가 아닌 경우)
  if (errors.length > 0 && !options?.lenient) {
    return { ok: false, errors };
  }

  // 성공 처리 및 ResolvedPack 빌드
  const validProblems = (packObj.problems || []).filter((p) => !invalidProblems[p.id]);
  const orderedProblems = [...validProblems].sort((a, b) => a.order - b.order);

  const resolvedPack: ResolvedPack = {
    schemaVersion: 1,
    packId: packObj.packId!,
    contentVersion: packObj.contentVersion!,
    purpose: purpose!,
    title: packObj.title!,
    pieceTypes: packObj.pieceTypes!,
    problems: packObj.problems!,
    typeById,
    problemById,
    orderedProblems,
    instanceLabel,
    invalidProblems: Object.keys(invalidProblems).length > 0 ? invalidProblems : undefined,
  };

  return { ok: true, pack: resolvedPack };
};
