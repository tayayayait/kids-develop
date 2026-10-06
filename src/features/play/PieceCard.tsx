import React from "react";
import { Check } from "lucide-react";
import { PieceImage } from "@/components/game/art/registry";
import type { PieceState } from "@/domain/types";

interface PieceCardProps {
  instanceId: string;
  pieceState: PieceState;
  asset: string;
  name: string;
  displayNumber: number;
  isSelected: boolean;
  isDraggingOrigin?: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  pointerHandlers?: React.HTMLAttributes<HTMLButtonElement> | undefined;
}

export const PieceCard = React.memo(function PieceCard({
  instanceId,
  pieceState,
  asset,
  name,
  displayNumber,
  isSelected,
  isDraggingOrigin = false,
  onSelect,
  pointerHandlers,
}: PieceCardProps) {
  const pieceTitle = name.endsWith("조각")
    ? `${name} ${displayNumber}`
    : `${name} 조각 ${displayNumber}`;
  const fullLabel = `${pieceTitle}, ${pieceState.rotation}도`;

  return (
    <button
      type="button"
      onClick={(e) => onSelect(instanceId, e)}
      aria-pressed={isSelected}
      aria-label={fullLabel}
      {...pointerHandlers}
      className={`relative flex flex-col items-center justify-between w-[84px] h-[92px] min-w-[84px] min-h-[92px] shrink-0 rounded-2xl bg-white p-1.5 transition-all duration-120 cursor-pointer select-none ${
        isSelected
          ? "border-[3px] border-emerald-500 bg-emerald-50/60 shadow-md ring-4 ring-emerald-300/40 -translate-y-1"
          : "border-2 border-slate-200 hover:border-emerald-400 hover:shadow-sm"
      }`}
      style={{
        touchAction: "none",
        userSelect: "none",
        opacity: isDraggingOrigin ? 0.3 : 1,
      }}
    >
      <div className="w-12 h-12 flex items-center justify-center shrink-0 pointer-events-none">
        <PieceImage
          asset={asset}
          rotation={pieceState.rotation}
          className="w-12 h-12 pointer-events-none select-none transition-transform duration-150"
        />
      </div>
      <div className="w-full flex items-center justify-center gap-1 pointer-events-none pb-0.5">
        <span className="text-xs font-bold tabular-nums text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
          조각 {displayNumber}
        </span>
        {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />}
      </div>
    </button>
  );
});
