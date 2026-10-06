import React from "react";
import { ArrowDownToLine, Ban, Check, Lock } from "lucide-react";
import { PieceImage } from "@/components/game/art/registry";
import type { Cell, PieceState } from "@/domain/types";

interface BoardCellProps {
  cell: Cell;
  piece?: PieceState | undefined;
  pieceAsset?: string | undefined;
  pieceName?: string | undefined;
  isLocked?: boolean;
  isBlocked: boolean;
  isSelected: boolean;
  isFocused: boolean;
  isDraggingOrigin?: boolean;
  previewTarget?: "ok" | "bad" | null;
  onActivate: (cell: Cell) => void;
  pointerHandlers?: React.HTMLAttributes<HTMLDivElement> | undefined;
}

export const BoardCell = React.memo(function BoardCell({
  cell,
  piece,
  pieceAsset,
  pieceName,
  isLocked = false,
  isBlocked,
  isSelected,
  isFocused,
  isDraggingOrigin = false,
  previewTarget,
  onActivate,
  pointerHandlers,
}: BoardCellProps) {
  const occ = piece;
  const label = `${cell.row + 1}행 ${cell.col + 1}열, ${
    isLocked
      ? "고정된 조각"
      : occ
        ? `${pieceName || "조각"}, ${occ.rotation}도${isSelected ? ", 선택됨" : ""}`
        : isBlocked
          ? "놓을 수 없음"
          : "빈칸"
  }`;

  return (
    <div
      role="gridcell"
      data-cell={`${cell.row}-${cell.col}`}
      tabIndex={isFocused ? 0 : -1}
      aria-colindex={cell.col + 1}
      aria-label={label}
      aria-selected={isSelected}
      onClick={() => onActivate(cell)}
      {...(isLocked ? {} : pointerHandlers)}
      className={`relative grid place-items-center rounded-xl border-2 transition-all ${
        isBlocked ? "cell-blocked border-slate-300" : "bg-white/95 border-amber-200/80 shadow-sm"
      } ${isSelected ? "bg-emerald-50 !border-emerald-500 ring-4 ring-emerald-300/40" : ""} ${
        previewTarget
          ? previewTarget === "ok"
            ? "!border-emerald-500 ring-4 ring-emerald-300/60 bg-emerald-50"
            : "!border-red-500 bg-red-50 ring-4 ring-red-300/40"
          : ""
      }`}
      style={{
        touchAction: occ && !isLocked ? "none" : undefined,
        userSelect: occ ? "none" : undefined,
        opacity: isDraggingOrigin ? 0.3 : 1,
      }}
    >
      {occ && pieceAsset && (
        <PieceImage
          asset={pieceAsset}
          rotation={occ.rotation}
          className="h-[calc(100%-8px)] w-[calc(100%-8px)]"
        />
      )}
      {isLocked && (
        <span className="absolute left-1 top-1 text-muted-foreground" title="고정된 조각">
          <Lock className="h-4 w-4" />
          <span className="sr-only">고정된 조각</span>
        </span>
      )}
      {isSelected && (
        <Check className="absolute right-1 top-1 h-4 w-4 rounded-full bg-primary text-primary-foreground" />
      )}
      {previewTarget === "ok" && (
        <ArrowDownToLine className="absolute h-6 w-6 text-success animate-pulse" />
      )}
      {previewTarget === "bad" && <Ban className="absolute h-6 w-6 text-error" />}
    </div>
  );
});
