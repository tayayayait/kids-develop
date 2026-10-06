import React, { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "@/components/game/IconButton";
import type { PieceInstance, PieceState, Problem, ResolvedPack } from "@/domain/types";
import { PieceCard } from "./PieceCard";
import type { DropTargetState } from "./usePointerInteraction";

interface PieceTrayProps {
  pack: ResolvedPack;
  problem: Problem;
  trayPieces: {
    instance: PieceInstance;
    state: Extract<PieceState, { location: "tray" }>;
  }[];
  selectedInstanceId: string | null;
  currentPage: number;
  pageSize?: number;
  mode?: "three-column" | "stacked" | "narrow";
  dropTarget?: DropTargetState | null;
  draggingPieceId?: string | null;
  trayRef?: React.RefObject<HTMLDivElement | null>;
  onSelectPiece: (id: string, e: React.MouseEvent) => void;
  onSetPage: (page: number) => void;
  getPiecePointerHandlers?: (id: string) => React.HTMLAttributes<HTMLButtonElement>;
}

export function PieceTray({
  pack,
  problem,
  trayPieces,
  selectedInstanceId,
  currentPage,
  pageSize = 4,
  mode = "three-column",
  dropTarget,
  draggingPieceId,
  trayRef,
  onSelectPiece,
  onSetPage,
  getPiecePointerHandlers,
}: PieceTrayProps) {
  const pageCount = Math.max(1, Math.ceil(trayPieces.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), pageCount);

  // 선택된 tray 조각이 현재 페이지 밖에 있으면 해당 페이지로 이동 (13.4)
  useEffect(() => {
    if (selectedInstanceId) {
      const idx = trayPieces.findIndex((p) => p.instance.id === selectedInstanceId);
      if (idx !== -1) {
        const targetPage = Math.floor(idx / pageSize) + 1;
        if (targetPage !== currentPage && targetPage <= pageCount) {
          onSetPage(targetPage);
        }
      }
    }
  }, [selectedInstanceId, trayPieces, pageSize, currentPage, pageCount, onSetPage]);

  const startIndex = (safePage - 1) * pageSize;
  const currentItems = trayPieces.slice(startIndex, startIndex + pageSize);

  const isTrayDropTarget = dropTarget?.kind === "tray";

  if (mode === "stacked" || mode === "narrow") {
    // 세로 쌓기 조각함 (높이 128px, 좌측 136px 제어부, 우측 한 줄 카드)
    return (
      <section
        ref={trayRef}
        aria-labelledby="tray-title"
        data-keep-selection="true"
        className={`w-full h-[128px] rounded-2xl bg-[var(--card)] p-2 border-2 transition-all flex flex-row items-center gap-3 ${
          isTrayDropTarget
            ? "border-[var(--success)] bg-[var(--success-bg)]/30 ring-2 ring-[var(--success)]/40"
            : "border-[var(--border)]"
        }`}
      >
        {/* 좌측 136px 영역 (제목, 개수, 48px 페이지 버튼) */}
        <div className="w-[136px] min-w-[136px] h-full flex flex-col justify-between py-1 border-r border-[var(--border)] pr-2">
          <div className="flex flex-col">
            <h2
              id="tray-title"
              className="text-base font-bold text-[var(--foreground)] leading-tight"
            >
              조각함
            </h2>
            <span className="text-sm font-semibold tabular-nums text-[var(--muted-foreground)]">
              {trayPieces.length}개 남음
            </span>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center gap-1">
              <IconButton
                aria-label="조각함 이전 페이지"
                icon={<ChevronLeft />}
                disabled={safePage <= 1}
                onClick={() => onSetPage(safePage - 1)}
                className="w-10 h-10 min-w-[40px] min-h-[40px]"
              />
              <span className="text-xs font-semibold tabular-nums text-[var(--muted-foreground)] px-1">
                {safePage}/{pageCount}
              </span>
              <IconButton
                aria-label="조각함 다음 페이지"
                icon={<ChevronRight />}
                disabled={safePage >= pageCount}
                onClick={() => onSetPage(safePage + 1)}
                className="w-10 h-10 min-w-[40px] min-h-[40px]"
              />
            </div>
          )}
        </div>

        {/* 우측 카드 영역 */}
        <div className="flex-1 h-full flex items-center overflow-x-auto">
          {trayPieces.length === 0 ? (
            <p className="text-sm font-medium text-[var(--muted-foreground)] px-2">
              조각을 모두 놓았어요. 보드의 조각을 눌러 옮기거나 돌릴 수 있어요.
            </p>
          ) : (
            <ul className="flex items-center gap-2">
              {currentItems.map(({ instance, state }) => {
                const pieceType = pack.typeById[instance.typeId];
                const isSelected = selectedInstanceId === instance.id;
                const displayNumber = pack.instanceLabel?.[problem.id]?.[instance.id] ?? 1;
                const isDraggingOrigin = draggingPieceId === instance.id;

                return (
                  <li key={instance.id} className="shrink-0">
                    <PieceCard
                      instanceId={instance.id}
                      pieceState={state}
                      asset={pieceType?.asset || ""}
                      name={pieceType?.name || "조각"}
                      displayNumber={displayNumber}
                      isSelected={isSelected}
                      isDraggingOrigin={isDraggingOrigin}
                      onSelect={onSelectPiece}
                      pointerHandlers={getPiecePointerHandlers?.(instance.id)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 스크린리더 페이지 안내 */}
        <div className="sr-only" aria-live="polite">
          조각함 {safePage}/{pageCount}쪽
        </div>
      </section>
    );
  }

  // 3열 가로 조각함 (폭 192px, 2열 80px 카드, 상단 헤더, 하단 페이지 도구)
  return (
    <section
      ref={trayRef}
      aria-labelledby="tray-title"
      data-keep-selection="true"
      className={`w-[192px] min-w-[192px] h-full flex flex-col rounded-2xl bg-[var(--card)] p-2 border-2 transition-all ${
        isTrayDropTarget
          ? "border-[var(--success)] bg-[var(--success-bg)]/30 ring-2 ring-[var(--success)]/40"
          : "border-[var(--border)]"
      }`}
    >
      <div className="h-7 flex items-center justify-between px-1 mb-2">
        <h2 id="tray-title" className="text-base font-bold text-[var(--foreground)]">
          조각함
        </h2>
        <span className="text-sm font-semibold tabular-nums text-[var(--muted-foreground)]">
          남은 조각: {trayPieces.length}
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-start">
        {trayPieces.length === 0 ? (
          <div className="p-2 text-sm font-medium text-[var(--muted-foreground)] leading-relaxed">
            조각을 모두 놓았어요. 보드의 조각을 눌러 옮기거나 돌릴 수 있어요.
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {currentItems.map(({ instance, state }) => {
              const pieceType = pack.typeById[instance.typeId];
              const isSelected = selectedInstanceId === instance.id;
              const displayNumber = pack.instanceLabel?.[problem.id]?.[instance.id] ?? 1;
              const isDraggingOrigin = draggingPieceId === instance.id;

              return (
                <li key={instance.id} className="flex justify-center">
                  <PieceCard
                    instanceId={instance.id}
                    pieceState={state}
                    asset={pieceType?.asset || ""}
                    name={pieceType?.name || "조각"}
                    displayNumber={displayNumber}
                    isSelected={isSelected}
                    isDraggingOrigin={isDraggingOrigin}
                    onSelect={onSelectPiece}
                    pointerHandlers={getPiecePointerHandlers?.(instance.id)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {pageCount > 1 && (
        <div className="min-h-[56px] flex items-center justify-between border-t border-[var(--border)] pt-2 mt-auto">
          <IconButton
            aria-label="조각함 이전 페이지"
            icon={<ChevronLeft />}
            disabled={safePage <= 1}
            onClick={() => onSetPage(safePage - 1)}
          />
          <span className="text-sm font-semibold tabular-nums text-[var(--muted-foreground)]">
            {safePage} / {pageCount}
          </span>
          <IconButton
            aria-label="조각함 다음 페이지"
            icon={<ChevronRight />}
            disabled={safePage >= pageCount}
            onClick={() => onSetPage(safePage + 1)}
          />
        </div>
      )}

      {/* 스크린리더 페이지 안내 */}
      <div className="sr-only" aria-live="polite">
        조각함 {safePage}/{pageCount}쪽
      </div>
    </section>
  );
}
