import React from "react";
import { Button } from "@/components/game/Button";
import type { JudgeStatus } from "@/state/playTypes";

interface ActionBarProps {
  canEdit: boolean;
  canCheck: boolean;
  canNext: boolean;
  judgeStatus: JudgeStatus;
  isLastProblem: boolean;
  mode?: "three-column" | "stacked" | "narrow";
  onReset: () => void;
  onCheck: () => void;
  onNext: () => void;
}

export function ActionBar({
  canEdit,
  canCheck,
  canNext,
  judgeStatus,
  isLastProblem,
  mode = "three-column",
  onReset,
  onCheck,
  onNext,
}: ActionBarProps) {
  const isChecking = judgeStatus === "checking";
  const isNarrow = mode === "narrow";

  const nextLabel = isLastProblem ? "학습 마치기" : "다음 문제";

  return (
    <div
      className={`min-h-[72px] py-2 flex items-center justify-between gap-3 ${
        isNarrow ? "flex-col w-full" : "flex-row flex-wrap"
      }`}
    >
      <Button
        variant="secondary"
        disabled={!canEdit}
        onClick={onReset}
        className={`min-w-[144px] ${isNarrow ? "w-full" : ""}`}
      >
        다시 하기
      </Button>

      <div className={`flex items-center gap-3 ${isNarrow ? "flex-col w-full" : "flex-row"}`}>
        {!canNext && (
          <span
            id="next-desc"
            className="text-xs sm:text-sm font-medium text-[var(--muted-foreground)] tabular-nums"
            aria-live="polite"
          >
            조건을 맞추면 다음 문제로 갈 수 있어요.
          </span>
        )}

        <div className={`flex items-center gap-3 ${isNarrow ? "flex-col w-full" : "flex-row"}`}>
          {/* 13.2 규격: canNext 여부에 따른 Primary/Secondary 반전 */}
          <Button
            variant={canNext ? "secondary" : "primary"}
            disabled={!canCheck || isChecking}
            loading={isChecking}
            loadingText="확인 중"
            onClick={onCheck}
            className={`min-w-[176px] ${isNarrow ? "w-full" : ""}`}
          >
            확인하기
          </Button>

          <Button
            variant={canNext ? "primary" : "secondary"}
            disabled={!canNext}
            onClick={onNext}
            aria-describedby={!canNext ? "next-desc" : undefined}
            className={`min-w-[144px] ${isNarrow ? "w-full" : ""}`}
          >
            {nextLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
