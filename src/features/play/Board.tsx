import React, { useRef } from "react";
import type { Cell, ConnectionJudge, PieceState, Problem, ResolvedPack } from "@/domain/types";
import { BoardCell } from "./BoardCell";
import { useBoardKeyboard } from "./useBoardKeyboard";
import type { DropTargetState } from "./usePointerInteraction";

interface BoardProps {
  pack: ResolvedPack;
  problem: Problem;
  pieces: PieceState[];
  selectedInstanceId: string | null;
  focusedCell: Cell;
  dropTarget?: DropTargetState | null;
  draggingPieceId?: string | null;
  gridRef?: React.RefObject<HTMLDivElement | null>;
  onActivateCell: (cell: Cell) => void;
  onFocusCell: (cell: Cell) => void;
  getPiecePointerHandlers?: (instanceId: string) => React.HTMLAttributes<HTMLDivElement>;
}

export function Board({
  pack,
  problem,
  pieces,
  selectedInstanceId,
  focusedCell,
  dropTarget,
  draggingPieceId,
  gridRef: externalGridRef,
  onActivateCell,
  onFocusCell,
  getPiecePointerHandlers,
}: BoardProps) {
  const localGridRef = useRef<HTMLDivElement | null>(null);
  const gridRef = externalGridRef ?? localGridRef;

  const { onKeyDown } = useBoardKeyboard({
    focusedCell,
    onFocusCell,
    onActivateCell,
    gridElement: gridRef.current,
  });

  const instMap = new Map(problem.pieces.map((p) => [p.id, p]));
  const boardPieces = pieces.filter(
    (p): p is Extract<PieceState, { location: "board" }> => p.location === "board",
  );
  const occMap = new Map(boardPieces.map((p) => [`${p.cell.row},${p.cell.col}`, p]));
  const blockedSet = new Set(problem.board.blockedCells.map((c) => `${c.row},${c.col}`));

  const terminals =
    problem.judge.mode === "connection" ? (problem.judge as ConnectionJudge).terminals : [];

  return (
    <div data-keep-selection="true" className="mx-auto flex items-center justify-center max-w-full">
      <div
        className="relative rounded-3xl border-4 border-amber-200 bg-amber-50/50 p-3.5 shadow-[0_12px_28px_rgba(245,158,11,0.12)] shrink-0 select-none"
        style={{
          width: "var(--board-size, 400px)",
          height: "var(--board-size, 400px)",
        }}
      >
        <div className="relative h-full w-full">
          <div
            ref={gridRef}
            role="grid"
            aria-label="5×5 보드 (5행 5열 조각 보드)"
            aria-rowcount={5}
            aria-colcount={5}
            aria-describedby="pattern-desc"
            onKeyDown={onKeyDown}
            className="grid h-full w-full grid-cols-5 grid-rows-5 gap-1"
          >
            {Array.from({ length: 5 }, (_, rowIdx) => (
              <div key={rowIdx} role="row" aria-rowindex={rowIdx + 1} className="contents">
                {Array.from({ length: 5 }, (_, colIdx) => {
                  const cell: Cell = { row: rowIdx, col: colIdx };
                  const key = `${cell.row},${cell.col}`;
                  const occ = occMap.get(key);
                  const isBlocked = blockedSet.has(key);
                  const isSelected = !!(occ && occ.instanceId === selectedInstanceId);
                  const isFocused = cell.row === focusedCell.row && cell.col === focusedCell.col;

                  const inst = occ ? instMap.get(occ.instanceId) : undefined;
                  const isLocked = inst?.locked ?? false;
                  const pieceType = inst ? pack.typeById[inst.typeId] : undefined;
                  const pieceLabel =
                    occ && pack.instanceLabel?.[problem.id]?.[occ.instanceId]
                      ? `${pieceType?.name || "조각"} ${pack.instanceLabel[problem.id]![occ.instanceId]}`
                      : pieceType?.name;

                  const isDraggingOrigin = occ && occ.instanceId === draggingPieceId;

                  const previewTarget =
                    dropTarget?.kind === "cell" &&
                    dropTarget.cell?.row === cell.row &&
                    dropTarget.cell?.col === cell.col
                      ? dropTarget.valid
                        ? "ok"
                        : "bad"
                      : null;

                  return (
                    <BoardCell
                      key={key}
                      cell={cell}
                      piece={occ}
                      pieceAsset={pieceType?.asset}
                      pieceName={pieceLabel}
                      isLocked={isLocked}
                      isBlocked={isBlocked}
                      isSelected={isSelected}
                      isFocused={isFocused}
                      isDraggingOrigin={Boolean(isDraggingOrigin)}
                      previewTarget={previewTarget}
                      onActivate={onActivateCell}
                      pointerHandlers={
                        occ && !isLocked ? getPiecePointerHandlers?.(occ.instanceId) : undefined
                      }
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {terminals.map((t) => {
            const pos = `calc((100% - 16px) / 5 * ${
              t.side === "N" || t.side === "S" ? t.cell.col + 0.5 : t.cell.row + 0.5
            } + ${4 * (t.side === "N" || t.side === "S" ? t.cell.col : t.cell.row)}px - 5px)`;
            const style: React.CSSProperties =
              t.side === "W"
                ? { left: -11, top: pos }
                : t.side === "E"
                  ? { right: -11, top: pos }
                  : t.side === "N"
                    ? { top: -11, left: pos }
                    : { bottom: -11, left: pos };
            return (
              <span
                key={t.id}
                aria-hidden
                className="absolute h-2.5 w-2.5 rounded-full bg-piece"
                style={style}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
