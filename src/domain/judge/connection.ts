import type {
  ConnectionJudge,
  JudgeResult,
  PieceState,
  Problem,
  ResolvedPack,
  Side,
} from "../types";
import { DELTA, OPPOSITE_SIDE, rotateSide } from "./rotation";

const cellKey = (r: number, c: number) => `${r},${c}`;

interface RotatedPort {
  id: string;
  side: Side;
  channel: string;
  node: string;
}

/**
 * Connection 판정 모드 평가
 * 위상 그래프 및 접점 연결을 분석하여 경로, 단말 연결, 루프, 분기 조건을 검증한다.
 */
export function evaluateConnection(
  pack: ResolvedPack,
  problem: Problem,
  placed: Extract<PieceState, { location: "board" }>[],
  revision: number,
): JudgeResult {
  const judge = problem.judge as ConnectionJudge;
  const instMap = new Map(problem.pieces.map((p) => [p.id, p]));
  const occ = new Map(placed.map((p) => [cellKey(p.cell.row, p.cell.col), p]));

  // Union-Find 자료구조
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x);
    let r = x;
    while (parent.get(r) !== r) {
      r = parent.get(r)!;
    }
    parent.set(x, r);
    return r;
  };

  const degree = new Map<string, number>();
  const external = new Map<string, number>();
  const edges = new Set<string>();
  let cycle = false;

  const addEdge = (a: string, b: string) => {
    const ek = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (edges.has(ek)) return;
    edges.add(ek);
    degree.set(a, (degree.get(a) ?? 0) + 1);
    degree.set(b, (degree.get(b) ?? 0) + 1);

    const ra = find(a);
    const rb = find(b);
    if (ra === rb) {
      cycle = true;
    } else {
      parent.set(ra, rb);
    }
  };

  // 터미널 노드 초기화
  judge.terminals.forEach((t) => find(`T:${t.id}`));

  // 포트 사전 계산 (각 배치 조각에 대해 1회만 계산)
  const piecePortsMap = new Map<string, RotatedPort[]>();

  for (const p of placed) {
    const inst = instMap.get(p.instanceId);
    if (!inst) continue;
    const pieceType = pack.typeById[inst.typeId];
    if (!pieceType?.topology) {
      return {
        status: "system_error",
        code: "UNSUPPORTED_RULE",
        checkedRevision: revision,
      };
    }

    const rotatedPorts: RotatedPort[] = pieceType.topology.ports.map((pt) => ({
      id: pt.id,
      side: rotateSide(pt.side, p.rotation),
      channel: pt.channel,
      node: `${p.instanceId}:${pt.id}`,
    }));
    piecePortsMap.set(p.instanceId, rotatedPorts);

    // 노드 및 내부 간선 등록
    rotatedPorts.forEach((pt) => find(pt.node));
    pieceType.topology.internalNodes.forEach((n) => find(`${p.instanceId}:${n}`));
    pieceType.topology.internalEdges.forEach(([a, b]) =>
      addEdge(`${p.instanceId}:${a}`, `${p.instanceId}:${b}`),
    );
  }

  // 외부 접점 및 터미널 연결 검사
  for (const p of placed) {
    const ports = piecePortsMap.get(p.instanceId) || [];
    for (const pt of ports) {
      const [dr, dc] = DELTA[pt.side];
      const r = p.cell.row + dr;
      const c = p.cell.col + dc;

      // 보드 경계 밖인 경우 -> 터미널 확인
      if (r < 0 || r > 4 || c < 0 || c > 4) {
        const term = judge.terminals.find(
          (t) =>
            t.cell.row === p.cell.row &&
            t.cell.col === p.cell.col &&
            t.side === pt.side &&
            t.channel === pt.channel,
        );
        if (term) {
          addEdge(pt.node, `T:${term.id}`);
          external.set(pt.node, (external.get(pt.node) ?? 0) + 1);
        }
        continue;
      }

      // 인접 셀에 조각이 있는 경우
      const other = occ.get(cellKey(r, c));
      if (!other) continue;

      const otherPorts = piecePortsMap.get(other.instanceId) || [];
      const match = otherPorts.find(
        (op) => op.side === OPPOSITE_SIDE[pt.side] && op.channel === pt.channel,
      );
      if (match) {
        addEdge(pt.node, match.node);
        external.set(pt.node, (external.get(pt.node) ?? 0) + 1);
      }
    }
  }

  // 정책 검사 순서 고정:
  // 1) danglingPorts 검사
  if (!judge.allowDanglingPorts) {
    for (const p of placed) {
      const ports = piecePortsMap.get(p.instanceId) || [];
      for (const pt of ports) {
        if ((external.get(pt.node) ?? 0) !== 1) {
          return {
            status: "incorrect",
            code: "RULE_NOT_MET",
            checkedRevision: revision,
            debugReason: "dangling_port",
          };
        }
      }
    }
  }

  // 2) cycle 검사
  if (!judge.allowCycles && cycle) {
    return {
      status: "incorrect",
      code: "RULE_NOT_MET",
      checkedRevision: revision,
      debugReason: "cycle_detected",
    };
  }

  // 3) branch 검사 (차수 >= 3)
  if (!judge.allowBranches && [...degree.values()].some((d) => d >= 3)) {
    return {
      status: "incorrect",
      code: "RULE_NOT_MET",
      checkedRevision: revision,
      debugReason: "branch_detected",
    };
  }

  // 4) requiredPairs 검사
  for (const [a, b] of judge.requiredPairs) {
    if (find(`T:${a}`) !== find(`T:${b}`)) {
      return {
        status: "incorrect",
        code: "RULE_NOT_MET",
        checkedRevision: revision,
        debugReason: "required_pair_disconnected",
      };
    }
  }

  // 5) forbiddenPairs 검사
  for (const [a, b] of judge.forbiddenPairs) {
    if (find(`T:${a}`) === find(`T:${b}`)) {
      return {
        status: "incorrect",
        code: "RULE_NOT_MET",
        checkedRevision: revision,
        debugReason: "forbidden_pair_connected",
      };
    }
  }

  // 6) disconnectedComponents 검사
  if (!judge.allowDisconnectedComponents) {
    const roots = new Set([...parent.keys()].map(find));
    if (roots.size !== 1) {
      return {
        status: "incorrect",
        code: "RULE_NOT_MET",
        checkedRevision: revision,
        debugReason: "disconnected_components",
      };
    }
  }

  return {
    status: "correct",
    code: "ALL_RULES_MET",
    checkedRevision: revision,
  };
}
