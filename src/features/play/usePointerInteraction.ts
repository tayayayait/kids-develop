import React, { useCallback, useEffect, useRef, useState } from "react";
import { hitCell, resolveDrop, type RectLike } from "@/domain/layout/hitTest";
import type { MessageCode } from "@/domain/messages";
import type { Cell, PieceState, Problem, ResolvedPack, Rotation } from "@/domain/types";

export interface DropTargetState {
  kind: "cell" | "tray" | "outside";
  cell?: Cell;
  valid: boolean;
}

export interface PreviewData {
  instanceId: string;
  asset: string;
  rotation: Rotation;
  size: number;
}

export interface UsePointerInteractionOptions {
  canEdit: boolean;
  pack: ResolvedPack | null;
  problem: Problem | null;
  pieces: PieceState[];
  selectedInstanceId: string | null;
  onSelect: (instanceId: string | null) => void;
  onPlace: (instanceId: string, cell: Cell) => void;
  onReturnToTray: (instanceId: string) => void;
  onFeedback: (code: MessageCode) => void;
  gridRef: React.RefObject<HTMLDivElement | null>;
  trayRef: React.RefObject<HTMLDivElement | null>;
  previewRef: React.RefObject<HTMLDivElement | null>;
}

interface GestureSnapshot {
  gestureId: number;
  pointerId: number;
  instanceId: string;
  origin: "board" | "tray";
  originCell?: Cell | undefined;
  startX: number;
  startY: number;
  elementWidth: number;
  elementHeight: number;
  ratioX: number;
  ratioY: number;
  prevSelected: string | null;
  targetElement: HTMLElement;
}

let gestureCounter = 0;

export function usePointerInteraction({
  canEdit,
  pack,
  problem,
  pieces,
  selectedInstanceId,
  onSelect,
  onPlace,
  onReturnToTray,
  onFeedback,
  gridRef,
  trayRef,
  previewRef,
}: UsePointerInteractionOptions) {
  const [draggingPieceId, setDraggingPieceId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTargetState | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  const snapshotRef = useRef<GestureSnapshot | null>(null);
  const isDraggingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const suppressClickForRef = useRef<number | null>(null);
  const endedRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  // 최신 상태 ref
  const propsRef = useRef({
    canEdit,
    pack,
    problem,
    pieces,
    selectedInstanceId,
  });
  propsRef.current = {
    canEdit,
    pack,
    problem,
    pieces,
    selectedInstanceId,
  };

  const cancelActiveGesture = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    const snap = snapshotRef.current;
    if (snap && isDraggingRef.current) {
      // 드래그 중 취소 시 이전 선택 복구
      onSelect(snap.prevSelected);
    }

    if (snap && snap.targetElement.hasPointerCapture(snap.pointerId)) {
      try {
        snap.targetElement.releasePointerCapture(snap.pointerId);
      } catch {
        // ignore
      }
    }

    snapshotRef.current = null;
    isDraggingRef.current = false;
    activePointerIdRef.current = null;
    endedRef.current = true;

    setDraggingPieceId(null);
    setDropTarget(null);
    setPreviewData(null);
  }, [onSelect]);

  // 외부 이벤트(창 크기 변화, 화면 방향 전환, 백그라운드) 발생 시 취소
  useEffect(() => {
    const handleResize = () => {
      if (snapshotRef.current) {
        cancelActiveGesture();
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden" && snapshotRef.current) {
        cancelActiveGesture();
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handleResize);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [cancelActiveGesture]);

  const onPiecePointerDown = useCallback(
    (instanceId: string, event: React.PointerEvent<HTMLElement>) => {
      const { canEdit, problem, pack, pieces, selectedInstanceId } = propsRef.current;
      if (!canEdit || !problem || !pack) return;

      // 단일 포인터 정책 (T14)
      if (activePointerIdRef.current !== null) return;
      // 마우스인 경우 좌클릭(button === 0)만 허용
      if (event.pointerType === "mouse" && event.button !== 0) return;

      // 고정(locked) 조각은 드래그 불가
      const pieceDef = problem.pieces.find((p) => p.id === instanceId);
      if (!pieceDef || pieceDef.locked) return;

      const currentPiece = pieces.find((p) => p.instanceId === instanceId);
      if (!currentPiece) return;

      const targetEl = event.currentTarget;
      const rect = targetEl.getBoundingClientRect();

      const startX = event.clientX;
      const startY = event.clientY;
      const ratioX = rect.width > 0 ? (startX - rect.left) / rect.width : 0.5;
      const ratioY = rect.height > 0 ? (startY - rect.top) / rect.height : 0.5;

      const gestureId = ++gestureCounter;
      activePointerIdRef.current = event.pointerId;
      endedRef.current = false;
      isDraggingRef.current = false;

      snapshotRef.current = {
        gestureId,
        pointerId: event.pointerId,
        instanceId,
        origin: currentPiece.location,
        originCell: currentPiece.location === "board" ? currentPiece.cell : undefined,
        startX,
        startY,
        elementWidth: rect.width,
        elementHeight: rect.height,
        ratioX,
        ratioY,
        prevSelected: selectedInstanceId,
        targetElement: targetEl,
      };

      try {
        targetEl.setPointerCapture(event.pointerId);
      } catch {
        // 일부 브라우저 예외 무시
      }
    },
    [],
  );

  const onPiecePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const snap = snapshotRef.current;
      if (!snap || snap.pointerId !== event.pointerId || endedRef.current) return;

      const { problem, pack, pieces } = propsRef.current;
      if (!problem || !pack) return;

      const deltaX = event.clientX - snap.startX;
      const deltaY = event.clientY - snap.startY;
      const dist = Math.hypot(deltaX, deltaY);

      // 8px 이동 시 dragging으로 1회 전환
      if (!isDraggingRef.current) {
        if (dist >= 8) {
          isDraggingRef.current = true;
          setDraggingPieceId(snap.instanceId);

          const pieceDef = problem.pieces.find((p) => p.id === snap.instanceId);
          const pieceType = pieceDef ? pack.typeById[pieceDef.typeId] : null;
          const currentPiece = pieces.find((p) => p.instanceId === snap.instanceId);

          if (pieceType && currentPiece) {
            setPreviewData({
              instanceId: snap.instanceId,
              asset: pieceType.asset,
              rotation: currentPiece.rotation,
              size: Math.max(48, snap.elementWidth - 8),
            });
          }
        } else {
          return;
        }
      }

      // rAF를 통해 DOM ref의 transform을 직접 갱신 (React 리렌더 없음)
      const previewEl = previewRef.current;
      const previewSize = Math.max(48, snap.elementWidth - 8);

      const centerX = event.clientX + (0.5 - snap.ratioX) * previewSize;
      const centerY = event.clientY + (0.5 - snap.ratioY) * previewSize;
      const left = centerX - previewSize / 2;
      const top = centerY - previewSize / 2;

      if (previewEl) {
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
        }
        rafIdRef.current = requestAnimationFrame(() => {
          previewEl.style.transform = `translate3d(${left}px, ${top}px, 0)`;
          rafIdRef.current = null;
        });
      }

      // 후보 칸 계산 및 유효성 판정
      const gridRect: RectLike | null = gridRef.current
        ? gridRef.current.getBoundingClientRect()
        : null;
      const trayRect: RectLike | null = trayRef.current
        ? trayRef.current.getBoundingClientRect()
        : null;

      const dropRes = resolveDrop({ x: centerX, y: centerY }, gridRect, trayRect);

      if (dropRes.kind === "cell") {
        const cell = dropRes.cell;
        // 유효성: 금지칸 아니고, 빈칸(자기 조각이 원래 있던 칸은 유효)
        const isBlocked = problem.board.blockedCells.some(
          (b) => b.row === cell.row && b.col === cell.col,
        );
        const occupied = pieces.find(
          (p) =>
            p.location === "board" &&
            p.cell.row === cell.row &&
            p.cell.col === cell.col &&
            p.instanceId !== snap.instanceId,
        );

        const valid = !isBlocked && !occupied;
        setDropTarget((prev) => {
          if (
            prev?.kind === "cell" &&
            prev.cell?.row === cell.row &&
            prev.cell?.col === cell.col &&
            prev.valid === valid
          ) {
            return prev;
          }
          return { kind: "cell", cell, valid };
        });
      } else if (dropRes.kind === "tray") {
        const valid = snap.origin === "board";
        setDropTarget((prev) => {
          if (prev?.kind === "tray" && prev.valid === valid) return prev;
          return { kind: "tray", valid };
        });
      } else {
        setDropTarget((prev) => {
          if (prev?.kind === "outside") return prev;
          return { kind: "outside", valid: false };
        });
      }
    },
    [gridRef, previewRef, trayRef],
  );

  const onPiecePointerUp = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const snap = snapshotRef.current;
      if (!snap || snap.pointerId !== event.pointerId || endedRef.current) return;

      endedRef.current = true;
      activePointerIdRef.current = null;

      try {
        snap.targetElement.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }

      if (!isDraggingRef.current) {
        // 탭(Tap) 자격 확인: 8px 미만 이동 -> 후속 click에서 탭 로직 1회 처리되도록 보장
        snapshotRef.current = null;
        return;
      }

      // 드래그 종료 시 후속 포인터 click을 억제 (키보드 클릭은 제외)
      suppressClickForRef.current = snap.gestureId;

      const { problem, pieces } = propsRef.current;
      if (!problem) {
        cancelActiveGesture();
        return;
      }

      const previewSize = Math.max(48, snap.elementWidth - 8);
      const centerX = event.clientX + (0.5 - snap.ratioX) * previewSize;
      const centerY = event.clientY + (0.5 - snap.ratioY) * previewSize;

      const gridRect = gridRef.current?.getBoundingClientRect() ?? null;
      const trayRect = trayRef.current?.getBoundingClientRect() ?? null;
      const dropRes = resolveDrop({ x: centerX, y: centerY }, gridRect, trayRect);

      if (dropRes.kind === "cell") {
        const targetCell = dropRes.cell;
        // 원래 자기 칸이면 이동 없이 종료
        if (
          snap.origin === "board" &&
          snap.originCell &&
          snap.originCell.row === targetCell.row &&
          snap.originCell.col === targetCell.col
        ) {
          onSelect(snap.instanceId);
        } else {
          // 금지칸 체크
          const isBlocked = problem.board.blockedCells.some(
            (b) => b.row === targetCell.row && b.col === targetCell.col,
          );
          if (isBlocked) {
            onFeedback("TARGET_BLOCKED");
            onSelect(snap.prevSelected);
          } else {
            // 다른 조각 점유 체크
            const occupied = pieces.find(
              (p) =>
                p.location === "board" &&
                p.cell.row === targetCell.row &&
                p.cell.col === targetCell.col &&
                p.instanceId !== snap.instanceId,
            );
            if (occupied) {
              onFeedback("TARGET_OCCUPIED");
              onSelect(snap.prevSelected);
            } else {
              // 정상 배치 확정
              onPlace(snap.instanceId, targetCell);
              onSelect(snap.instanceId);
            }
          }
        }
      } else if (dropRes.kind === "tray") {
        if (snap.origin === "board") {
          onReturnToTray(snap.instanceId);
          onSelect(snap.instanceId);
        } else {
          // tray -> tray (이동 없음)
          onSelect(snap.instanceId);
        }
      } else {
        // outside
        onFeedback("OUTSIDE_BOARD");
        onSelect(snap.prevSelected);
      }

      snapshotRef.current = null;
      isDraggingRef.current = false;
      setDraggingPieceId(null);
      setDropTarget(null);
      setPreviewData(null);
    },
    [cancelActiveGesture, gridRef, onFeedback, onPlace, onReturnToTray, onSelect, trayRef],
  );

  const onPiecePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const snap = snapshotRef.current;
      if (!snap || snap.pointerId !== event.pointerId) return;
      cancelActiveGesture();
    },
    [cancelActiveGesture],
  );

  const onPieceLostPointerCapture = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const snap = snapshotRef.current;
      // 이미 정상 pointerup으로 종료된 경우 무시 (T16)
      if (!snap || endedRef.current) return;
      if (snap.pointerId !== event.pointerId) return;
      cancelActiveGesture();
    },
    [cancelActiveGesture],
  );

  // 후속 클릭 억제 필터
  const shouldSuppressClick = useCallback((): boolean => {
    if (suppressClickForRef.current !== null) {
      suppressClickForRef.current = null;
      return true;
    }
    return false;
  }, []);

  return {
    isDragging: isDraggingRef.current,
    draggingPieceId,
    dropTarget,
    previewData,
    onPiecePointerDown,
    onPiecePointerMove,
    onPiecePointerUp,
    onPiecePointerCancel,
    onPieceLostPointerCapture,
    shouldSuppressClick,
    cancelActiveGesture,
  };
}
