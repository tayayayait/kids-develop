import type { Cell, PieceState } from "../domain/types";
import type { MessageCode } from "../domain/messages";

export type ViewStatus = "booting" | "loading" | "ready" | "empty" | "error";
export type Interaction = "idle" | "pressing" | "dragging";
export type JudgeStatus =
  "unchecked" | "checking" | "incomplete" | "incorrect" | "correct" | "system_error";
export type SaveStatus = "idle" | "saving" | "saved" | "unavailable" | "error";
export type NavigationStatus = "idle" | "loading" | "error";
export type ModalKind = "none" | "help" | "pattern" | "reset" | "success" | "finish";

export interface Feedback {
  code: MessageCode;
  text: string;
  tone: "info" | "warning" | "error" | "success";
  at: number;
}

export interface PlayState {
  problemId: string;
  viewStatus: ViewStatus;
  interaction: Interaction;
  selectedInstanceId: string | null;
  focusedCell: Cell;
  judgeStatus: JudgeStatus;
  boardRevision: number;
  checkedRevision: number | null;
  everSolved: boolean;
  saveStatus: SaveStatus;
  navigationStatus: NavigationStatus;
  modal: ModalKind;
  feedback: Feedback | null;
  persistentWarning: Feedback | null; // 저장 경고 등 별도 지속 슬롯(13.7)
  pieces: PieceState[];
  trayPage: number; // 1부터 시작
}

export type PlayAction =
  | {
      type: "LOADED";
      payload: {
        problemId: string;
        pieces: PieceState[];
        boardRevision: number;
        everSolved: boolean;
        judgeStatus: JudgeStatus;
        checkedRevision: number | null;
        notice?: Feedback | null;
      };
    }
  | { type: "SELECT"; payload: { id: string | null } }
  | { type: "PLACE"; payload: { id: string; cell: Cell } }
  | { type: "RETURN_TO_TRAY"; payload: { id: string } }
  | { type: "ROTATE"; payload: { id: string } }
  | { type: "INTERACTION"; payload: { value: Interaction } }
  | { type: "CHECK_START" }
  | {
      type: "CHECK_RESULT";
      payload: {
        status: JudgeStatus;
        code: string;
        checkedRevision: number;
      };
    }
  | { type: "RESET"; payload: { initialPieces: PieceState[] } }
  | { type: "OPEN_MODAL"; payload: { kind: ModalKind } }
  | { type: "CLOSE_MODAL" }
  | { type: "REPLACE_MODAL"; payload: { kind: ModalKind } }
  | { type: "FOCUS_CELL"; payload: { cell: Cell } }
  | { type: "SET_TRAY_PAGE"; payload: { page: number } }
  | { type: "FEEDBACK"; payload: { code: MessageCode; text?: string; tone?: Feedback["tone"] } }
  | { type: "CLEAR_FEEDBACK" }
  | { type: "SAVE_STATUS"; payload: { status: SaveStatus } }
  | { type: "NAV_START" }
  | { type: "NAV_FAIL" }
  | { type: "NAV_DONE" };
