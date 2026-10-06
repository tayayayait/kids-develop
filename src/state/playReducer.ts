import { isInitial, placePiece, returnToTray, rotatePiece } from "../domain/board/board";
import { judgeToMessage, MESSAGES, type MessageCode } from "../domain/messages";
import type { JudgeResult, PieceState, Problem, ResolvedPack } from "../domain/types";
import { validateState } from "../domain/judge/validateState";
import { selectCanCheck, selectCanEdit, selectCanUseTools } from "./playSelectors";
import type { PlayAction, PlayState } from "./playTypes";

export function createInitialPlayState(
  problemId: string,
  initialPieces: PieceState[] = [],
): PlayState {
  return {
    problemId,
    viewStatus: "booting",
    interaction: "idle",
    selectedInstanceId: null,
    focusedCell: { row: 0, col: 0 },
    judgeStatus: "unchecked",
    boardRevision: 0,
    checkedRevision: null,
    everSolved: false,
    saveStatus: "idle",
    navigationStatus: "idle",
    modal: "none",
    feedback: null,
    persistentWarning: null,
    pieces: initialPieces,
    trayPage: 1,
  };
}

export function playReducer(
  state: PlayState,
  action: PlayAction,
  context: { pack: ResolvedPack; problem: Problem },
): PlayState {
  const { pack, problem } = context;

  const nextState = ((): PlayState => {
    switch (action.type) {
      case "LOADED": {
        const {
          problemId,
          pieces,
          boardRevision,
          everSolved,
          judgeStatus,
          checkedRevision,
          notice,
        } = action.payload;
        return {
          ...state,
          problemId,
          viewStatus: "ready",
          interaction: "idle",
          selectedInstanceId: null,
          focusedCell: { row: 0, col: 0 },
          modal: "none",
          feedback: notice || null,
          pieces,
          boardRevision,
          everSolved,
          judgeStatus,
          checkedRevision,
        };
      }

      case "SELECT": {
        if (!selectCanEdit(state)) return state;
        const targetId = action.payload.id;
        if (targetId === null) {
          return { ...state, selectedInstanceId: null };
        }
        const inst = problem.pieces.find((p) => p.id === targetId);
        if (!inst || inst.locked) {
          // 고정 조각 선택 시 피드백만 발생, 선택 변화 없음(T13)
          const msg = MESSAGES.FIXED_PIECE;
          return {
            ...state,
            feedback: { code: "FIXED_PIECE", text: msg.text, tone: msg.tone, at: Date.now() },
          };
        }
        return {
          ...state,
          selectedInstanceId: targetId,
        };
      }

      case "PLACE": {
        if (!selectCanEdit(state)) return state;
        const res = placePiece(problem, state.pieces, action.payload.id, action.payload.cell);
        if (!res.ok) {
          const msg = MESSAGES[res.code];
          return {
            ...state,
            feedback: { code: res.code, text: msg.text, tone: msg.tone, at: Date.now() },
          };
        }
        if (!res.changed) {
          return state;
        }
        // EDIT 공통 처리
        return {
          ...state,
          pieces: res.pieces,
          boardRevision: state.boardRevision + 1,
          judgeStatus: "unchecked",
          checkedRevision: null,
          feedback: null,
          selectedInstanceId: action.payload.id,
        };
      }

      case "RETURN_TO_TRAY": {
        if (!selectCanEdit(state)) return state;
        const res = returnToTray(problem, state.pieces, action.payload.id);
        if (!res.ok) {
          const msg = MESSAGES[res.code];
          return {
            ...state,
            feedback: { code: res.code, text: msg.text, tone: msg.tone, at: Date.now() },
          };
        }
        if (!res.changed) {
          return state;
        }
        // 회수한 조각이 속한 trayPage 산출 (한 페이지 4개 기준)
        const trayPieces = res.pieces.filter((p) => p.location === "tray");
        const idx = trayPieces.findIndex((p) => p.instanceId === action.payload.id);
        const targetPage = idx >= 0 ? Math.floor(idx / 4) + 1 : state.trayPage;

        // EDIT 공통 처리
        return {
          ...state,
          pieces: res.pieces,
          boardRevision: state.boardRevision + 1,
          judgeStatus: "unchecked",
          checkedRevision: null,
          feedback: null,
          selectedInstanceId: action.payload.id,
          trayPage: targetPage,
        };
      }

      case "ROTATE": {
        if (!selectCanUseTools(state)) return state;
        const res = rotatePiece(pack, problem, state.pieces, action.payload.id);
        if (!res.ok) {
          const msg = MESSAGES[res.code];
          return {
            ...state,
            feedback: { code: res.code, text: msg.text, tone: msg.tone, at: Date.now() },
          };
        }
        if (!res.changed) {
          return state;
        }
        // EDIT 공통 처리
        return {
          ...state,
          pieces: res.pieces,
          boardRevision: state.boardRevision + 1,
          judgeStatus: "unchecked",
          checkedRevision: null,
          feedback: null,
          selectedInstanceId: action.payload.id,
        };
      }

      case "INTERACTION": {
        return {
          ...state,
          interaction: action.payload.value,
        };
      }

      case "CHECK_START": {
        if (!selectCanCheck(state, problem)) return state;
        return {
          ...state,
          judgeStatus: "checking",
        };
      }

      case "CHECK_RESULT": {
        // J15: revision 불일치 결과는 무시
        if (action.payload.checkedRevision !== state.boardRevision) {
          return state;
        }
        const { status, code, checkedRevision } = action.payload;
        if (status === "correct") {
          return {
            ...state,
            judgeStatus: "correct",
            checkedRevision,
            everSolved: true,
            modal: "success",
            feedback: null,
          };
        }

        const msgCode =
          judgeToMessage({
            status: status as JudgeResult["status"],
            code,
            checkedRevision,
          }) || "RULE_NOT_MET";
        const msg = MESSAGES[msgCode];

        return {
          ...state,
          judgeStatus: status,
          checkedRevision,
          feedback: {
            code: msgCode,
            text: msg.text,
            tone: msg.tone,
            at: Date.now(),
          },
        };
      }

      case "RESET": {
        if (!selectCanEdit(state)) return state;
        const initial = action.payload.initialPieces;
        const wasInitial = isInitial(problem, state.pieces);
        return {
          ...state,
          pieces: initial,
          boardRevision: wasInitial ? state.boardRevision : state.boardRevision + 1,
          judgeStatus: "unchecked",
          checkedRevision: null,
          selectedInstanceId: null,
          feedback: null,
          trayPage: 1,
          modal: "none",
        };
      }

      case "OPEN_MODAL": {
        if (state.modal !== "none") return state;
        return {
          ...state,
          interaction: "idle",
          modal: action.payload.kind,
        };
      }

      case "CLOSE_MODAL": {
        return {
          ...state,
          modal: "none",
        };
      }

      case "REPLACE_MODAL": {
        return {
          ...state,
          interaction: "idle",
          modal: action.payload.kind,
        };
      }

      case "FOCUS_CELL": {
        return {
          ...state,
          focusedCell: action.payload.cell,
        };
      }

      case "SET_TRAY_PAGE": {
        if (state.interaction !== "idle") return state;
        return {
          ...state,
          trayPage: Math.max(1, action.payload.page),
        };
      }

      case "FEEDBACK": {
        const now = Date.now();
        const code = action.payload.code;
        if (state.feedback && state.feedback.code === code && now - state.feedback.at < 1000) {
          return {
            ...state,
            feedback: { ...state.feedback, at: now },
          };
        }
        const msg =
          (
            MESSAGES as Record<
              string,
              { text: string; tone: "info" | "warning" | "error" | "success" }
            >
          )[code] || MESSAGES.RULE_NOT_MET;
        return {
          ...state,
          feedback: {
            code,
            text: action.payload.text || msg.text,
            tone: action.payload.tone || msg.tone,
            at: now,
          },
        };
      }

      case "CLEAR_FEEDBACK": {
        return {
          ...state,
          feedback: null,
        };
      }

      case "SAVE_STATUS": {
        const status = action.payload.status;
        let persistentWarning = state.persistentWarning;
        if (status === "error" || status === "unavailable") {
          const msg = MESSAGES.STORAGE_FAILED;
          persistentWarning = {
            code: "STORAGE_FAILED",
            text: msg.text,
            tone: msg.tone,
            at: Date.now(),
          };
        } else if (status === "saved") {
          persistentWarning = null;
        }
        return {
          ...state,
          saveStatus: status,
          persistentWarning,
        };
      }

      case "NAV_START": {
        return { ...state, navigationStatus: "loading" };
      }

      case "NAV_FAIL": {
        return { ...state, navigationStatus: "error" };
      }

      case "NAV_DONE": {
        return { ...state, navigationStatus: "idle" };
      }

      default:
        return state;
    }
  })();

  if (process.env["NODE_ENV"] !== "production") {
    if (nextState.viewStatus === "ready") {
      const chk = validateState(pack, problem, nextState.pieces);
      if (!chk.ok) {
        console.error("INVARIANT_VIOLATION in playReducer:", action.type, chk.code);
      }
    }
  }

  return nextState;
}
