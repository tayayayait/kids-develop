import React from "react";
import { RotateCw, Undo2 } from "lucide-react";
import { Button } from "@/components/game/Button";

interface PieceToolsProps {
  canRotate: boolean;
  canReturn: boolean;
  selectedLabel: string | null;
  hasSelection?: boolean;
  canRotatePiece?: boolean;
  onRotate: () => void;
  onReturn: () => void;
}

export function PieceTools({
  canRotate,
  canReturn,
  selectedLabel,
  hasSelection = false,
  canRotatePiece = true,
  onRotate,
  onReturn,
}: PieceToolsProps) {
  let descriptionText = "조각을 고르면 돌릴 수 있어요.";
  if (selectedLabel) {
    if (hasSelection && !canRotatePiece) {
      descriptionText = "이 조각은 돌리지 않아요";
    } else {
      descriptionText = `${selectedLabel} 선택됨`;
    }
  }

  return (
    <div className="mt-3 flex flex-col items-center gap-2">
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="secondary"
          disabled={!canRotate}
          onClick={onRotate}
          aria-describedby="sel-desc"
          icon={<RotateCw className="w-5 h-5" />}
          className="btn-toy-amber min-w-[144px] shadow-sm font-bold"
        >
          돌리기
        </Button>
        <Button
          variant="secondary"
          disabled={!canReturn}
          onClick={onReturn}
          aria-describedby="sel-desc"
          icon={<Undo2 className="w-5 h-5" />}
          className="btn-toy-secondary min-w-[160px] shadow-sm font-bold"
        >
          조각함으로
        </Button>
      </div>
      <p
        id="sel-desc"
        className="min-h-[24px] text-sm md:text-base font-medium text-center text-[var(--muted-foreground)] tabular-nums"
      >
        {descriptionText}
      </p>
    </div>
  );
}
