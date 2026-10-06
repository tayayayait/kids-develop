import { describe, expect, it } from "vitest";
import engineeringDemoRaw from "@/content/packs/engineering-demo.json";
import { validateContent } from "@/domain/content/validateContent";
import type { PieceState } from "@/domain/types";
import { createInitialPlayState, playReducer } from "@/state/playReducer";
import {
  selectCanCheck,
  selectCanEdit,
  selectCanNext,
  selectCanNextInSuccessModal,
  selectCanRotate,
} from "@/state/playSelectors";

describe("Play State Reducer (playReducer & selectors)", () => {
  const packRes = validateContent(engineeringDemoRaw);
  if (!packRes.ok) throw new Error("Pack validation failed");
  const pack = packRes.pack;
  const p1 = pack.problems[0]!; // p-001
  const p9 = pack.problemById["p-009"]!; // line-1이 locked: true

  const ctxP1 = { pack, problem: p1 };
  const ctxP9 = { pack, problem: p9 };

  it("T04: 배치(PLACE) 시 boardRevision이 1 증가하고 선택이 유지된다", () => {
    let state = createInitialPlayState(p1.id, p1.initialPieces);
    state = playReducer(
      state,
      {
        type: "LOADED",
        payload: {
          problemId: p1.id,
          pieces: p1.initialPieces,
          boardRevision: 0,
          everSolved: false,
          judgeStatus: "unchecked",
          checkedRevision: null,
        },
      },
      ctxP1,
    );

    // 조각 선택
    state = playReducer(state, { type: "SELECT", payload: { id: "line-1" } }, ctxP1);
    expect(state.selectedInstanceId).toBe("line-1");

    // 빈칸(2,0)에 배치
    state = playReducer(
      state,
      { type: "PLACE", payload: { id: "line-1", cell: { row: 2, col: 0 } } },
      ctxP1,
    );

    expect(state.boardRevision).toBe(1);
    expect(state.selectedInstanceId).toBe("line-1");
    const p = state.pieces.find((x) => x.instanceId === "line-1");
    expect(p?.location).toBe("board");
    if (p?.location === "board") {
      expect(p.cell).toEqual({ row: 2, col: 0 });
    }
  });

  it("T09: 동일한 자기 칸으로 다시 배치하면 boardRevision이 변하지 않는다", () => {
    let state = createInitialPlayState(p1.id, p1.initialPieces);
    state = playReducer(
      state,
      {
        type: "LOADED",
        payload: {
          problemId: p1.id,
          pieces: p1.initialPieces,
          boardRevision: 0,
          everSolved: false,
          judgeStatus: "unchecked",
          checkedRevision: null,
        },
      },
      ctxP1,
    );
    state = playReducer(
      state,
      { type: "PLACE", payload: { id: "line-1", cell: { row: 2, col: 0 } } },
      ctxP1,
    );
    expect(state.boardRevision).toBe(1);

    // 같은 칸에 다시 PLACE
    state = playReducer(
      state,
      { type: "PLACE", payload: { id: "line-1", cell: { row: 2, col: 0 } } },
      ctxP1,
    );
    expect(state.boardRevision).toBe(1);
  });

  it("T10: 회수(RETURN_TO_TRAY) 시 각도가 유지되고 boardRevision이 증가한다", () => {
    let state = createInitialPlayState(p1.id, p1.initialPieces);
    state = playReducer(
      state,
      {
        type: "LOADED",
        payload: {
          problemId: p1.id,
          pieces: p1.initialPieces,
          boardRevision: 0,
          everSolved: false,
          judgeStatus: "unchecked",
          checkedRevision: null,
        },
      },
      ctxP1,
    );
    state = playReducer(
      state,
      { type: "PLACE", payload: { id: "line-1", cell: { row: 2, col: 0 } } },
      ctxP1,
    );
    state = playReducer(state, { type: "ROTATE", payload: { id: "line-1" } }, ctxP1);
    const rot = state.pieces.find((x) => x.instanceId === "line-1")!.rotation;

    state = playReducer(state, { type: "RETURN_TO_TRAY", payload: { id: "line-1" } }, ctxP1);
    const p = state.pieces.find((x) => x.instanceId === "line-1");
    expect(p?.location).toBe("tray");
    expect(p?.rotation).toBe(rot);
    expect(state.boardRevision).toBe(3);
  });

  it("T11: 회전(ROTATE) 시 허용 각도 순서(0->90->180->270->0)로 순환한다", () => {
    let state = createInitialPlayState(p1.id, p1.initialPieces);
    state = playReducer(
      state,
      {
        type: "LOADED",
        payload: {
          problemId: p1.id,
          pieces: p1.initialPieces,
          boardRevision: 0,
          everSolved: false,
          judgeStatus: "unchecked",
          checkedRevision: null,
        },
      },
      ctxP1,
    );
    state = playReducer(state, { type: "SELECT", payload: { id: "line-1" } }, ctxP1);

    expect(state.pieces.find((x) => x.instanceId === "line-1")!.rotation).toBe(0);

    state = playReducer(state, { type: "ROTATE", payload: { id: "line-1" } }, ctxP1);
    expect(state.pieces.find((x) => x.instanceId === "line-1")!.rotation).toBe(90);

    state = playReducer(state, { type: "ROTATE", payload: { id: "line-1" } }, ctxP1);
    expect(state.pieces.find((x) => x.instanceId === "line-1")!.rotation).toBe(180);

    state = playReducer(state, { type: "ROTATE", payload: { id: "line-1" } }, ctxP1);
    expect(state.pieces.find((x) => x.instanceId === "line-1")!.rotation).toBe(270);

    state = playReducer(state, { type: "ROTATE", payload: { id: "line-1" } }, ctxP1);
    expect(state.pieces.find((x) => x.instanceId === "line-1")!.rotation).toBe(0);
  });

  it("T13: 고정 조각(locked) 조작 시도 시 FIXED_PIECE 피드백이 발생하고 선택 및 배치가 변하지 않는다", () => {
    let state = createInitialPlayState(p9.id, p9.initialPieces);
    state = playReducer(
      state,
      {
        type: "LOADED",
        payload: {
          problemId: p9.id,
          pieces: p9.initialPieces,
          boardRevision: 0,
          everSolved: false,
          judgeStatus: "unchecked",
          checkedRevision: null,
        },
      },
      ctxP9,
    );

    // 고정 조각 선택 시도
    state = playReducer(state, { type: "SELECT", payload: { id: "line-1" } }, ctxP9);
    expect(state.selectedInstanceId).toBe(null);
    expect(state.feedback?.code).toBe("FIXED_PIECE");

    // 고정 조각 이동 시도
    state = playReducer(
      state,
      { type: "PLACE", payload: { id: "line-1", cell: { row: 0, col: 0 } } },
      ctxP9,
    );
    expect(state.feedback?.code).toBe("FIXED_PIECE");
    expect(state.boardRevision).toBe(0);
  });

  it("T18: 판정 결과 오답(incorrect)이어도 배치와 선택 상태가 유지된다", () => {
    let state = createInitialPlayState(p1.id, p1.initialPieces);
    state = playReducer(
      state,
      {
        type: "LOADED",
        payload: {
          problemId: p1.id,
          pieces: p1.initialPieces,
          boardRevision: 1,
          everSolved: false,
          judgeStatus: "unchecked",
          checkedRevision: null,
        },
      },
      ctxP1,
    );
    // 조각을 보드에 배치 (placedMovableCount > 0 필요)
    state = playReducer(
      state,
      { type: "PLACE", payload: { id: "line-1", cell: { row: 2, col: 0 } } },
      ctxP1,
    );
    expect(state.selectedInstanceId).toBe("line-1");

    // 판정 시작
    state = playReducer(state, { type: "CHECK_START" }, ctxP1);
    expect(state.judgeStatus).toBe("checking");

    // 오답 결과 전달 (boardRevision은 1에서 PLACE로 인해 2가 됨)
    const curRev = state.boardRevision;
    state = playReducer(
      state,
      {
        type: "CHECK_RESULT",
        payload: { status: "incorrect", code: "RULE_NOT_MET", checkedRevision: curRev },
      },
      ctxP1,
    );

    expect(state.judgeStatus).toBe("incorrect");
    expect(state.selectedInstanceId).toBe("line-1");
    expect(state.feedback?.code).toBe("RULE_NOT_MET");
    expect(state.modal).toBe("none");
  });

  it("T21: 정답(correct) 이후 편집(PLACE)하면 judgeStatus는 unchecked로 리셋되지만 everSolved는 유지된다", () => {
    let state = createInitialPlayState(p1.id, p1.initialPieces);
    state = playReducer(
      state,
      {
        type: "LOADED",
        payload: {
          problemId: p1.id,
          pieces: p1.initialPieces,
          boardRevision: 2,
          everSolved: false,
          judgeStatus: "checking",
          checkedRevision: null,
        },
      },
      ctxP1,
    );

    // 정답 결과 수신
    state = playReducer(
      state,
      {
        type: "CHECK_RESULT",
        payload: { status: "correct", code: "ALL_RULES_MET", checkedRevision: 2 },
      },
      ctxP1,
    );
    expect(state.judgeStatus).toBe("correct");
    expect(state.everSolved).toBe(true);
    expect(state.modal).toBe("success");

    // 모달 닫고 조각 편집
    state = playReducer(state, { type: "CLOSE_MODAL" }, ctxP1);
    state = playReducer(
      state,
      { type: "PLACE", payload: { id: "line-1", cell: { row: 0, col: 0 } } },
      ctxP1,
    );

    expect(state.judgeStatus).toBe("unchecked");
    expect(state.checkedRevision).toBe(null);
    expect(state.everSolved).toBe(true);
  });

  it("T22: 리셋(RESET) 시 초기 상태와 동일하면 revision 유지, 다르면 +1", () => {
    let state = createInitialPlayState(p1.id, p1.initialPieces);
    state = playReducer(
      state,
      {
        type: "LOADED",
        payload: {
          problemId: p1.id,
          pieces: p1.initialPieces,
          boardRevision: 0,
          everSolved: false,
          judgeStatus: "unchecked",
          checkedRevision: null,
        },
      },
      ctxP1,
    );

    // 아직 아무것도 변경하지 않은 상태에서 RESET -> revision 유지
    state = playReducer(
      state,
      { type: "RESET", payload: { initialPieces: p1.initialPieces } },
      ctxP1,
    );
    expect(state.boardRevision).toBe(0);

    // 변경 후 RESET -> revision + 1
    state = playReducer(
      state,
      { type: "PLACE", payload: { id: "line-1", cell: { row: 2, col: 0 } } },
      ctxP1,
    );
    expect(state.boardRevision).toBe(1);

    state = playReducer(
      state,
      { type: "RESET", payload: { initialPieces: p1.initialPieces } },
      ctxP1,
    );
    expect(state.boardRevision).toBe(2);
    expect(state.pieces).toEqual(p1.initialPieces);
  });

  it("J15: 현재 boardRevision과 다른 checkedRevision 결과는 폐기(무시)된다", () => {
    let state = createInitialPlayState(p1.id, p1.initialPieces);
    state = playReducer(
      state,
      {
        type: "LOADED",
        payload: {
          problemId: p1.id,
          pieces: p1.initialPieces,
          boardRevision: 5,
          everSolved: false,
          judgeStatus: "unchecked",
          checkedRevision: null,
        },
      },
      ctxP1,
    );

    // 편집으로 rev 6으로 증가
    state = playReducer(
      state,
      { type: "PLACE", payload: { id: "line-2", cell: { row: 1, col: 1 } } },
      ctxP1,
    );
    expect(state.boardRevision).toBe(6);
    expect(state.judgeStatus).toBe("unchecked");

    // 이전 rev 5에 대한 판정 결과 도착 -> 무시됨
    state = playReducer(
      state,
      {
        type: "CHECK_RESULT",
        payload: { status: "correct", code: "ALL_RULES_MET", checkedRevision: 5 },
      },
      ctxP1,
    );

    // rev 6과 불일치하므로 무시되어 여전히 unchecked, modal은 none
    expect(state.judgeStatus).toBe("unchecked");
    expect(state.modal).toBe("none");
    expect(selectCanNext(state)).toBe(false);
  });

  it("J20: system_error 상태에서 조각을 편집하면 unchecked로 리셋되고 피드백이 초기화된다", () => {
    let state = createInitialPlayState(p1.id, p1.initialPieces);
    state = playReducer(
      state,
      {
        type: "LOADED",
        payload: {
          problemId: p1.id,
          pieces: p1.initialPieces,
          boardRevision: 3,
          everSolved: false,
          judgeStatus: "system_error",
          checkedRevision: 3,
        },
      },
      ctxP1,
    );

    state = playReducer(
      state,
      { type: "PLACE", payload: { id: "line-1", cell: { row: 2, col: 0 } } },
      ctxP1,
    );
    expect(state.judgeStatus).toBe("unchecked");
    expect(state.checkedRevision).toBe(null);
    expect(state.feedback).toBe(null);
  });
});
