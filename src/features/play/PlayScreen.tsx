import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ErrorPanel } from "@/components/game/ErrorPanel";
import { Skeleton } from "@/components/game/Skeleton";
import { PieceImage } from "@/components/game/art/registry";
import type { Cell, PieceState } from "@/domain/types";
import { checkBrowserSupport } from "@/services/support/browserSupport";
import { useProgressSummary } from "@/features/progress/useProgressSummary";
import { ActionBar } from "./ActionBar";
import { Board } from "./Board";
import { FeedbackBox } from "./FeedbackBox";
import { PatternPanel } from "./PatternPanel";
import { PieceTools } from "./PieceTools";
import { PieceTray } from "./PieceTray";
import { PlayHeader } from "./PlayHeader";
import { FinishModal } from "./modals/FinishModal";
import { HelpModal } from "./modals/HelpModal";
import { PatternModal } from "./modals/PatternModal";
import { ResetModal } from "./modals/ResetModal";
import { SuccessModal } from "./modals/SuccessModal";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { usePlayController } from "./usePlayController";
import { usePointerInteraction } from "./usePointerInteraction";

interface PlayScreenProps {
  problemId: string;
}

export function PlayScreen({ problemId }: PlayScreenProps) {
  const navigate = useNavigate();
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  const controller = usePlayController(problemId, (nextId) => {
    navigate({ to: "/play/$problemId", params: { problemId: nextId } });
  });

  const {
    state,
    pack,
    problem,
    canEdit,
    canRotate,
    canReturn,
    canCheck,
    canNext,
    canNextInSuccessModal,
    selectedPiece,
    trayPieces,
    nextProblemId,
    dispatch,
    selectPiece,
    place,
    returnPiece,
    rotate,
    check,
    reset,
    nextProblem,
    openModal,
    closeModal,
    setTrayPage,
    focusCell,
  } = controller;

  const gridRef = useRef<HTMLDivElement | null>(null);
  const trayRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const {
    isDragging,
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
  } = usePointerInteraction({
    canEdit,
    pack,
    problem,
    pieces: state.pieces,
    selectedInstanceId: state.selectedInstanceId,
    onSelect: selectPiece,
    onPlace: place,
    onReturnToTray: returnPiece,
    onFeedback: (code) => dispatch({ type: "FEEDBACK", payload: { code } }),
    gridRef,
    trayRef,
    previewRef,
  });

  // 8.2 표: 조각 선택 탭 활성화 로직
  const activatePiece = useCallback(
    (id: string) => {
      if (shouldSuppressClick()) return;
      if (!problem) return;

      const pieceDef = problem.pieces.find((p) => p.id === id);
      if (pieceDef?.locked) {
        dispatch({ type: "FEEDBACK", payload: { code: "FIXED_PIECE" } });
        return;
      }

      if (state.selectedInstanceId === id) {
        // 이미 선택된 조각 재클릭 -> 선택 해제
        selectPiece(null);
      } else {
        // 다른 가변 조각 선택
        selectPiece(id);
      }
    },
    [problem, selectPiece, shouldSuppressClick, state.selectedInstanceId, dispatch],
  );

  // 8.2 표: 보드 셀 탭 활성화 로직
  const handleActivateCell = useCallback(
    (cell: Cell) => {
      if (shouldSuppressClick()) return;
      if (!canEdit || !problem) return;

      // 금지칸 클릭
      const isBlocked = problem.board.blockedCells.some(
        (b) => b.row === cell.row && b.col === cell.col,
      );
      if (isBlocked) {
        dispatch({ type: "FEEDBACK", payload: { code: "TARGET_BLOCKED" } });
        return;
      }

      // 점유 셀 확인
      const occ = state.pieces.find(
        (p: PieceState) =>
          p.location === "board" && p.cell.row === cell.row && p.cell.col === cell.col,
      );

      if (occ) {
        activatePiece(occ.instanceId);
        return;
      }

      // 빈칸 클릭
      if (selectedPiece) {
        // 선택된 조각을 빈칸에 배치 (선택 유지)
        place(selectedPiece.instanceId, cell);
      } else {
        // 선택 없는 빈칸 클릭
        dispatch({ type: "FEEDBACK", payload: { code: "SELECT_FIRST" } });
      }
    },
    [
      activatePiece,
      canEdit,
      dispatch,
      place,
      problem,
      selectedPiece,
      shouldSuppressClick,
      state.pieces,
    ],
  );

  // 8.6 표 & 5-6: Escape 우선순위 (모달 닫기 -> 드래그 취소 -> 선택 해제)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (state.modal !== "none") {
          e.preventDefault();
          closeModal();
        } else if (isDragging) {
          e.preventDefault();
          cancelActiveGesture();
        } else if (state.selectedInstanceId) {
          e.preventDefault();
          selectPiece(null);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    state.modal,
    isDragging,
    state.selectedInstanceId,
    closeModal,
    cancelActiveGesture,
    selectPiece,
  ]);

  const getPiecePointerHandlers = useCallback(
    (id: string) => ({
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => onPiecePointerDown(id, e),
      onPointerMove: onPiecePointerMove,
      onPointerUp: onPiecePointerUp,
      onPointerCancel: onPiecePointerCancel,
      onLostPointerCapture: onPieceLostPointerCapture,
    }),
    [
      onPiecePointerDown,
      onPiecePointerMove,
      onPiecePointerUp,
      onPiecePointerCancel,
      onPieceLostPointerCapture,
    ],
  );

  const [browserSupported] = useState(() => checkBrowserSupport().supported);
  const [patternHeight, setPatternHeight] = useState(112);
  const layout = useResponsiveLayout(patternHeight);
  const summary = useProgressSummary(pack);

  // 7-4: 저장 복원 완료 후 'ready' 상태 진입 시 제목(#play-title)으로 포커스
  const hasFocusedTitle = useRef(false);
  useEffect(() => {
    if (state.viewStatus === "ready" && !hasFocusedTitle.current) {
      hasFocusedTitle.current = true;
      titleRef.current?.focus();
    }
    if (state.viewStatus !== "ready") {
      hasFocusedTitle.current = false;
    }
  }, [state.viewStatus, problemId]);

  if (!browserSupported) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <ErrorPanel
          title="이 브라우저에서는 조각을 움직일 수 없어요."
          description="다른 브라우저로 열어 주세요."
        />
      </div>
    );
  }

  if (pack && !problem) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <ErrorPanel
          title="이 문제를 찾을 수 없어요."
          description="목록으로 돌아가서 다른 문제를 골라 주세요."
          actions={
            <Link to="/problems" className="btn btn-primary min-w-[144px]">
              문제 목록
            </Link>
          }
        />
      </div>
    );
  }

  if (state.viewStatus === "booting" || !pack) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[1280px] w-full flex-col justify-between p-4 wide:px-6">
        <Skeleton delay={300} className="h-16 w-full rounded-xl" />
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <Skeleton delay={300} className="w-80 h-80 rounded-2xl" />
          <p className="t-child text-muted-foreground animate-pulse">문제를 준비하고 있어요.</p>
        </div>
        <Skeleton delay={300} className="h-14 w-full rounded-xl" />
      </div>
    );
  }

  if (state.viewStatus === "error") {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <ErrorPanel
          title="이 문제를 준비하지 못했어요."
          description="다른 문제를 골라 주세요."
          code={state.feedback?.code}
          actions={
            <Link to="/problems" className="btn btn-primary min-w-[144px]">
              문제 목록
            </Link>
          }
        />
      </div>
    );
  }

  if (!problem) {
    return null;
  }

  const selectedPieceDef = selectedPiece
    ? problem.pieces.find((p) => p.id === selectedPiece.instanceId)
    : undefined;
  const selectedType = selectedPieceDef ? pack.typeById[selectedPieceDef.typeId] : undefined;
  const selectedLabel = selectedPiece
    ? `${selectedType?.name || "조각"} ${
        pack.instanceLabel?.[problem.id]?.[selectedPiece.instanceId] ?? ""
      }`.trim()
    : null;
  const canRotateSelected = (selectedType?.allowedRotations?.length ?? 4) > 1;

  const isLastProblem = !nextProblemId;

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={
        {
          "--board-size": `${layout.B}px`,
        } as React.CSSProperties
      }
      onClick={(e) => {
        // 보드 밖 여백 탭 시 선택 해제 (5-4)
        const target = e.target as HTMLElement | null;
        if (target && !target.closest("[data-keep-selection]") && state.selectedInstanceId) {
          selectPiece(null);
        }
      }}
    >
      <div data-keep-selection="true">
        <PlayHeader
          order={problem.order}
          total={pack.problems.length}
          titleRef={titleRef}
          onBeforeLeave={cancelActiveGesture}
          onOpenHelp={() => openModal("help")}
        />
      </div>

      <main className="mx-auto w-full max-w-[1280px] px-4 wide:px-6 py-4 flex-1 flex flex-col justify-between">
        {layout.mode === "three-column" ? (
          /* 가로 3열 레이아웃 (1024px 이상) */
          <div className="grid grid-cols-[240px_minmax(0,1fr)_192px] gap-5 items-start">
            {/* 좌: 도안 패널 + 피드백 박스 */}
            <div className="flex flex-col gap-3 min-w-[240px]">
              <PatternPanel
                problem={problem}
                mode="three-column"
                onOpenZoom={() => openModal("pattern")}
              />
              <FeedbackBox feedback={state.feedback} persistentWarning={state.persistentWarning} />
            </div>

            {/* 중: 5x5 보드 + 회전/회수 도구 */}
            <div className="flex flex-col items-center justify-center">
              <Board
                pack={pack}
                problem={problem}
                pieces={state.pieces}
                selectedInstanceId={state.selectedInstanceId}
                focusedCell={state.focusedCell}
                dropTarget={dropTarget}
                draggingPieceId={draggingPieceId}
                gridRef={gridRef}
                onActivateCell={handleActivateCell}
                onFocusCell={focusCell}
                getPiecePointerHandlers={getPiecePointerHandlers}
              />
              <div data-keep-selection="true">
                <PieceTools
                  canRotate={canRotate}
                  canReturn={canReturn}
                  selectedLabel={selectedLabel}
                  hasSelection={!!selectedPiece}
                  canRotatePiece={canRotateSelected}
                  onRotate={() => selectedPiece && rotate(selectedPiece.instanceId)}
                  onReturn={() => selectedPiece && returnPiece(selectedPiece.instanceId)}
                />
              </div>
            </div>

            {/* 우: 조각함 */}
            <div className="h-full flex justify-end">
              <PieceTray
                pack={pack}
                problem={problem}
                trayPieces={trayPieces}
                selectedInstanceId={state.selectedInstanceId}
                currentPage={state.trayPage}
                pageSize={layout.trayPageSize}
                mode="three-column"
                dropTarget={dropTarget}
                draggingPieceId={draggingPieceId}
                trayRef={trayRef}
                onSelectPiece={(id) => activatePiece(id)}
                onSetPage={setTrayPage}
                getPiecePointerHandlers={getPiecePointerHandlers}
              />
            </div>
          </div>
        ) : (
          /* 세로 쌓기 / 좁은 화면 레이아웃 (600~1023px 및 <600px) */
          <div className="flex flex-col gap-4">
            {/* 도안 요약 */}
            <PatternPanel
              problem={problem}
              mode={layout.mode}
              onOpenZoom={() => openModal("pattern")}
              onHeightChange={setPatternHeight}
            />

            {/* 보드 (필요 시 가로 스크롤 허용) */}
            <div
              className={`w-full py-1 flex justify-center ${
                layout.boardScroll ? "overflow-x-auto" : ""
              }`}
            >
              <Board
                pack={pack}
                problem={problem}
                pieces={state.pieces}
                selectedInstanceId={state.selectedInstanceId}
                focusedCell={state.focusedCell}
                dropTarget={dropTarget}
                draggingPieceId={draggingPieceId}
                gridRef={gridRef}
                onActivateCell={handleActivateCell}
                onFocusCell={focusCell}
                getPiecePointerHandlers={getPiecePointerHandlers}
              />
            </div>

            {/* 도구 */}
            <div data-keep-selection="true">
              <PieceTools
                canRotate={canRotate}
                canReturn={canReturn}
                selectedLabel={selectedLabel}
                hasSelection={!!selectedPiece}
                canRotatePiece={canRotateSelected}
                onRotate={() => selectedPiece && rotate(selectedPiece.instanceId)}
                onReturn={() => selectedPiece && returnPiece(selectedPiece.instanceId)}
              />
            </div>

            {/* 조각함 */}
            <PieceTray
              pack={pack}
              problem={problem}
              trayPieces={trayPieces}
              selectedInstanceId={state.selectedInstanceId}
              currentPage={state.trayPage}
              pageSize={layout.trayPageSize}
              mode={layout.mode}
              dropTarget={dropTarget}
              draggingPieceId={draggingPieceId}
              trayRef={trayRef}
              onSelectPiece={(id) => activatePiece(id)}
              onSetPage={setTrayPage}
              getPiecePointerHandlers={getPiecePointerHandlers}
            />

            {/* 피드백 (액션 바로 위) */}
            <FeedbackBox feedback={state.feedback} persistentWarning={state.persistentWarning} />
          </div>
        )}

        {/* 액션 영역 */}
        <div data-keep-selection="true" className="mt-4">
          <ActionBar
            canEdit={canEdit}
            canCheck={canCheck}
            canNext={canNext}
            judgeStatus={state.judgeStatus}
            isLastProblem={isLastProblem}
            mode={layout.mode}
            onReset={reset}
            onCheck={check}
            onNext={nextProblem}
          />
        </div>
      </main>

      {/* 실시간 드래그 미리보기 오버레이 (rAF 기반 직접 위치 변환) */}
      {previewData && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          <div
            ref={previewRef}
            style={{ width: previewData.size, height: previewData.size }}
            className="absolute top-0 left-0 will-change-transform drop-shadow-2xl opacity-95 transition-none"
          >
            <PieceImage
              asset={previewData.asset}
              rotation={previewData.rotation}
              className="w-full h-full"
            />
          </div>
        </div>
      )}

      {/* 모달 렌더링 */}
      {state.modal === "help" && <HelpModal onClose={closeModal} />}
      {state.modal === "pattern" && <PatternModal problem={problem} onClose={closeModal} />}
      {state.modal === "reset" && <ResetModal onClose={closeModal} onConfirm={reset} />}
      {state.modal === "success" && (
        <SuccessModal
          canNext={canNextInSuccessModal}
          isLastProblem={isLastProblem}
          onClose={closeModal}
          onNext={nextProblem}
        />
      )}
      {state.modal === "finish" && (
        <FinishModal
          onClose={closeModal}
          everSolvedCount={summary.solvedCount}
          total={pack.problems.length}
        />
      )}
    </div>
  );
}
