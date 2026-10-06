import type { Cell, JudgeResult, Rotation } from "./types";

export type MessageCode =
  | "SELECT_FIRST"
  | "TARGET_OCCUPIED"
  | "TARGET_BLOCKED"
  | "OUTSIDE_BOARD"
  | "FIXED_PIECE"
  | "MISSING_REQUIRED"
  | "REQUIRED_CELL_EMPTY"
  | "RULE_NOT_MET"
  | "NETWORK_FAILED"
  | "CONTENT_INVALID"
  | "ACCESS_DENIED"
  | "STORAGE_UNAVAILABLE"
  | "STORAGE_FAILED"
  | "RESTORE_INVALID"
  | "CHECK_FAILED"
  | "CONTENT_CHANGED"
  | "NEXT_LOAD_FAILED"
  | "ROTATION_LOCKED";

export interface MessageDefinition {
  text: string;
  tone: "info" | "warning" | "error" | "success";
}

export const MESSAGES: Record<MessageCode, MessageDefinition> = {
  SELECT_FIRST: { text: "먼저 조각을 골라요.", tone: "warning" },
  TARGET_OCCUPIED: { text: "다른 조각이 있어요. 빈칸에 놓아 보세요.", tone: "error" },
  TARGET_BLOCKED: { text: "여기에는 놓을 수 없어요.", tone: "error" },
  OUTSIDE_BOARD: { text: "보드 안의 빈칸에 놓아 보세요.", tone: "error" },
  FIXED_PIECE: { text: "고정된 조각이에요.", tone: "warning" },
  MISSING_REQUIRED: { text: "조각을 더 놓아 볼까요?", tone: "warning" },
  REQUIRED_CELL_EMPTY: { text: "도안의 조건을 다시 살펴볼까요?", tone: "warning" },
  RULE_NOT_MET: { text: "아직 조건이 맞지 않아요. 조각을 옮기거나 돌려 보세요.", tone: "warning" },
  NETWORK_FAILED: { text: "인터넷 연결을 확인하고 다시 눌러 주세요.", tone: "error" },
  CONTENT_INVALID: { text: "이 문제를 준비하지 못했어요. 다른 문제를 골라 주세요.", tone: "error" },
  ACCESS_DENIED: { text: "이 문제를 열 수 없어요. 보호자에게 알려 주세요.", tone: "error" },
  STORAGE_UNAVAILABLE: {
    text: "이 기기에서는 풀이가 저장되지 않아요. 지금 문제는 계속 풀 수 있어요.",
    tone: "warning",
  },
  STORAGE_FAILED: {
    text: "풀이를 저장하지 못했어요. 화면을 닫으면 마지막 변경이 남지 않을 수 있어요.",
    tone: "warning",
  },
  RESTORE_INVALID: {
    text: "지난 배치를 불러오지 못했어요. 처음 상태로 시작해요.",
    tone: "warning",
  },
  CHECK_FAILED: { text: "확인하는 중 문제가 생겼어요. 다시 눌러 주세요.", tone: "error" },
  CONTENT_CHANGED: { text: "문제가 바뀌어 처음부터 풀어요.", tone: "info" },
  NEXT_LOAD_FAILED: { text: "다음 문제를 가져오지 못했어요. 다시 눌러 주세요.", tone: "error" },
  ROTATION_LOCKED: { text: "이 조각은 돌리지 않아요", tone: "info" },
};

/** 한국어 받침 여부에 따른 조사 부착 헬퍼 ("을/를", "은/는", "이/가") */
export const josa = (word: string, format: "을/를" | "은/는" | "이/가"): string => {
  if (!word) return "";
  const lastChar = word.charCodeAt(word.length - 1);
  // 한글 음절 범위: 0xAC00 ~ 0xD7A3
  if (lastChar >= 0xac00 && lastChar <= 0xd7a3) {
    const hasJongseong = (lastChar - 0xac00) % 28 > 0;
    if (format === "을/를") return hasJongseong ? "을" : "를";
    if (format === "은/는") return hasJongseong ? "은" : "는";
    if (format === "이/가") return hasJongseong ? "이" : "가";
  }
  // 숫자나 영문일 때 기본 분기
  const endsWithConsonant = /[136780lmnr]$/i.test(word);
  if (format === "을/를") return endsWithConsonant ? "을" : "를";
  if (format === "은/는") return endsWithConsonant ? "은" : "는";
  if (format === "이/가") return endsWithConsonant ? "이" : "가";
  return (format as string).split("/")[0] ?? "";
};

export const say = {
  selected: (name: string) => `${name}${josa(name, "을/를")} 골랐어요. 빈칸을 눌러요.`,
  unselected: () => "선택을 풀었어요.",
  placed: (name: string, cell: Cell) =>
    `${name}${josa(name, "을/를")} ${cell.row + 1}행 ${cell.col + 1}열에 놓았어요.`,
  returned: (name: string) => `${name}${josa(name, "을/를")} 조각함으로 돌려놓았어요.`,
  rotated: (name: string, rot: Rotation) => `${name}, ${rot}도로 돌렸어요.`,
  trayPage: (page: number, total: number) => `조각함 ${page}/${total}쪽`,
};

/** 판정 결과 -> 안내 메시지 코드 변환 */
export const judgeToMessage = (result: JudgeResult): MessageCode | null => {
  if (result.status === "correct") return null;
  if (result.status === "incomplete") {
    if (result.code === "REQUIRED_CELL_EMPTY") return "REQUIRED_CELL_EMPTY";
    return "MISSING_REQUIRED";
  }
  if (result.status === "incorrect") {
    return "RULE_NOT_MET";
  }
  if (result.status === "system_error") {
    return "CHECK_FAILED";
  }
  return null;
};
