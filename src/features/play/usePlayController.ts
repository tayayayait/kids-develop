import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { placePiece, returnToTray, rotatePiece } from "@/domain/board/board";
import { evaluate } from "@/domain/judge/evaluate";
import { MESSAGES } from "@/domain/messages";
import type { Cell, PieceState, ResolvedPack } from "@/domain/types";
import { contentRepository } from "@/services/content/ContentRepository";
import { getProgressRepository } from "@/services/progress/createProgressRepository";
import type { ProgressRepository } from "@/services/progress/ProgressRepository";
import { restoreAttempt } from "@/services/progress/restoreAttempt";
import {
  createSaveQueue,
  type AttemptSnapshot,
  type SaveQueue,
} from "@/services/progress/saveQueue";
import { announce } from "@/services/a11y/liveAnnouncer";
import { createInitialPlayState, playReducer } from "@/state/playReducer";
import type { ModalKind, PlayAction, PlayState } from "@/state/playTypes";
import {
  selectCanCheck,
  selectCanEdit,
  selectCanNext,
  selectCanNextInSuccessModal,
  selectCanReturn,
  selectCanRotate,
  selectCanUseTools,
  selectPlacedMovableCount,
  selectSelectedPiece,
  selectTrayPieces,
} from "@/state/playSelectors";
import {
  prepareProblem,
  preparedProblemCache,
  type PreparedProblem,
} from "@/services/content/prepareProblem";

export interface PlayControllerOptions {
  onNavigateNext?: (nextProblemId: string) => void;
  prepareProblemFn?: (id: string) => Promise<PreparedProblem>;
}

export function usePlayController(
  problemId: string,
  onNavigateNextOrOptions?: ((nextProblemId: string) => void) | PlayControllerOptions,
) {
  const onNavigateNext =
    typeof onNavigateNextOrOptions === "function"
      ? onNavigateNextOrOptions
      : onNavigateNextOrOptions?.onNavigateNext;
  const prepareFn =
    typeof onNavigateNextOrOptions === "object"
      ? onNavigateNextOrOptions?.prepareProblemFn
      : undefined;

  const packRef = useRef<ResolvedPack | null>(null);
  const [pack, setPack] = useState<ResolvedPack | null>(
    () => preparedProblemCache.get(problemId)?.pack ?? null,
  );
  const actionLockRef = useRef<boolean>(false);
  const repoRef = useRef<ProgressRepository | null>(null);
  const saveQueueRef = useRef<SaveQueue | null>(null);

  const [state, dispatch] = useReducer(
    (s: PlayState, a: PlayAction): PlayState => {
      if (!packRef.current) return s;
      const prob = packRef.current.problemById[s.problemId];
      if (!prob) {
        if (a.type === "FEEDBACK") {
          return {
            ...s,
            viewStatus: "error",
            feedback: {
              code: a.payload.code,
              text: a.payload.text || "문제를 찾을 수 없습니다.",
              tone: a.payload.tone || "error",
              at: Date.now(),
            },
          };
        }
        return s;
      }
      return playReducer(s, a, { pack: packRef.current, problem: prob });
    },
    problemId,
    (id) => createInitialPlayState(id),
  );

  const stateRef = useRef<PlayState>(state);
  stateRef.current = state;

  const acquireLock = () => {
    if (actionLockRef.current) return false;
    actionLockRef.current = true;
    queueMicrotask(() => {
      actionLockRef.current = false;
    });
    return true;
  };

  // 팩 및 문제, 진행 상태 로드
  useEffect(() => {
    let active = true;

    const load = async () => {
      const cached = preparedProblemCache.get(problemId);
      if (cached) {
        preparedProblemCache.delete(problemId);
        packRef.current = cached.pack;
        setPack(cached.pack);
        const repo = await getProgressRepository();
        if (!active) return;
        repoRef.current = repo;
        saveQueueRef.current?.dispose();
        saveQueueRef.current = createSaveQueue(repo, {
          debounceMs: 250,
          maxWaitMs: 1000,
          onStatus: (status) => {
            dispatch({ type: "SAVE_STATUS", payload: { status } });
          },
        });

        const restore = cached.restoreResult;
        if (restore.kind === "ok") {
          dispatch({
            type: "LOADED",
            payload: {
              problemId,
              pieces: restore.pieces,
              boardRevision: restore.boardRevision,
              everSolved: restore.everSolved,
              judgeStatus: restore.judgeStatus,
              checkedRevision: restore.checkedRevision,
            },
          });
        } else {
          dispatch({
            type: "LOADED",
            payload: {
              problemId,
              pieces: cached.problem.initialPieces,
              boardRevision: 0,
              everSolved: false,
              judgeStatus: "unchecked",
              checkedRevision: null,
            },
          });
        }
        return;
      }

      try {
        const [pack, repo] = await Promise.all([
          contentRepository.getPack(),
          getProgressRepository(),
        ]);
        if (!active) return;

        packRef.current = pack;
        setPack(pack);
        repoRef.current = repo;

        // saveQueue 초기화
        saveQueueRef.current?.dispose();
        saveQueueRef.current = createSaveQueue(repo, {
          debounceMs: 250,
          maxWaitMs: 1000,
          onStatus: (status) => {
            dispatch({ type: "SAVE_STATUS", payload: { status } });
          },
        });

        const problem = pack.problemById[problemId];
        if (!problem) {
          dispatch({
            type: "FEEDBACK",
            payload: { code: "CONTENT_INVALID", text: "문제를 찾을 수 없습니다." },
          });
          return;
        }

        const [rawAttempt, hasOther] = await Promise.all([
          repo.getAttempt(pack.packId, pack.contentVersion, problemId),
          repo.hasOtherVersion(pack.packId, pack.contentVersion, problemId),
        ]);

        if (!active) return;

        const restore = restoreAttempt(pack, problem, rawAttempt, hasOther);

        if (restore.kind === "ok") {
          dispatch({
            type: "LOADED",
            payload: {
              problemId,
              pieces: restore.pieces,
              boardRevision: restore.boardRevision,
              everSolved: restore.everSolved,
              judgeStatus: restore.judgeStatus,
              checkedRevision: restore.checkedRevision,
            },
          });
        } else if (restore.kind === "invalid") {
          dispatch({
            type: "LOADED",
            payload: {
              problemId,
              pieces: problem.initialPieces,
              boardRevision: 0,
              everSolved: false,
              judgeStatus: "unchecked",
              checkedRevision: null,
            },
          });
          dispatch({
            type: "FEEDBACK",
            payload: {
              code: "RESTORE_INVALID",
              text: MESSAGES.RESTORE_INVALID.text,
            },
          });
        } else {
          // kind === "none"
          dispatch({
            type: "LOADED",
            payload: {
              problemId,
              pieces: problem.initialPieces,
              boardRevision: 0,
              everSolved: false,
              judgeStatus: "unchecked",
              checkedRevision: null,
            },
          });
          if (restore.notice === "CONTENT_CHANGED") {
            dispatch({
              type: "FEEDBACK",
              payload: {
                code: "CONTENT_CHANGED",
                text: MESSAGES.CONTENT_CHANGED.text,
              },
            });
          }
        }
      } catch (err: unknown) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : "문제 준비 실패";
        dispatch({
          type: "FEEDBACK",
          payload: {
            code: "CONTENT_INVALID",
            text: msg,
          },
        });
      }
    };

    void load();

    return () => {
      active = false;
      void saveQueueRef.current?.flush(500);
      saveQueueRef.current?.dispose();
      saveQueueRef.current = null;
    };
  }, [problemId]);

  // 페이지 숨김 및 언로드 시 flushBestEffort
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveQueueRef.current?.flushBestEffort();
      }
    };
    const handlePageHide = () => {
      saveQueueRef.current?.flushBestEffort();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);

  const problem = pack?.problemById[problemId] ?? null;

  // 파생 상태 계산
  const canEdit = selectCanEdit(state);
  const canUseTools = selectCanUseTools(state);
  const canRotate = problem && pack ? selectCanRotate(state, problem, pack) : false;
  const canReturn = problem ? selectCanReturn(state, problem) : false;
  const canCheck = problem ? selectCanCheck(state, problem) : false;
  const canNext = selectCanNext(state);
  const canNextInSuccessModal = selectCanNextInSuccessModal(state);
  const selectedPiece = selectSelectedPiece(state);
  const placedMovableCount = problem ? selectPlacedMovableCount(state, problem) : 0;
  const trayPieces = problem ? selectTrayPieces(state, problem) : [];

  // 다음 문제 ID 산출
  const nextProblemId = (() => {
    if (!pack || !problem) return null;
    const curIdx = pack.orderedProblems.findIndex((p) => p.id === problem.id);
    if (curIdx >= 0 && curIdx < pack.orderedProblems.length - 1) {
      return pack.orderedProblems[curIdx + 1]!.id;
    }
    return null; // 마지막 문제
  })();

  const makeSnapshot = useCallback(
    (
      pieces: PieceState[],
      boardRevision: number,
      everSolved: boolean,
      lastCheck: AttemptSnapshot["lastCheck"],
    ): AttemptSnapshot | null => {
      if (!packRef.current || !problem) return null;
      return {
        packId: packRef.current.packId,
        contentVersion: packRef.current.contentVersion,
        problemId,
        boardRevision,
        pieces,
        everSolved,
        lastCheck,
      };
    },
    [problem, problemId],
  );

  // 핸들러 함수들
  const selectPiece = useCallback(
    (id: string | null) => {
      dispatch({ type: "SELECT", payload: { id } });
      if (id === null) {
        announce("선택을 풀었어요.", "DESELECT");
      } else if (pack && problem) {
        const pDef = problem.pieces.find((p) => p.id === id);
        const pType = pDef ? pack.typeById[pDef.typeId] : null;
        const pNum = pack.instanceLabel?.[problem.id]?.[id] ?? "";
        const pName = `${pType?.name || "조각"} ${pNum}`.trim();
        announce(`${pName} 선택됨`, `SELECT_${id}`);
      }
    },
    [pack, problem],
  );

  const place = useCallback(
    (id: string, cell: Cell) => {
      if (!canEdit || !problem) return;
      const res = placePiece(problem, state.pieces, id, cell);
      if (!res.ok) return;

      const nextRev = state.boardRevision + 1;
      dispatch({ type: "PLACE", payload: { id, cell } });

      if (pack) {
        const pDef = problem.pieces.find((p) => p.id === id);
        const pType = pDef ? pack.typeById[pDef.typeId] : null;
        const pNum = pack.instanceLabel?.[problem.id]?.[id] ?? "";
        const pName = `${pType?.name || "조각"} ${pNum}`.trim();
        announce(`${pName}을 ${cell.row + 1}행 ${cell.col + 1}열에 놓았어요.`, `PLACE_${id}`);
      }

      const snap = makeSnapshot(res.pieces, nextRev, state.everSolved, null);
      if (snap) {
        saveQueueRef.current?.schedule(snap);
      }
    },
    [canEdit, makeSnapshot, pack, problem, state.boardRevision, state.everSolved, state.pieces],
  );

  const returnPiece = useCallback(
    (id: string) => {
      if (!canEdit || !problem) return;
      const res = returnToTray(problem, state.pieces, id);
      if (!res.ok) return;

      const nextRev = state.boardRevision + 1;
      dispatch({ type: "RETURN_TO_TRAY", payload: { id } });

      if (pack) {
        const pDef = problem.pieces.find((p) => p.id === id);
        const pType = pDef ? pack.typeById[pDef.typeId] : null;
        const pNum = pack.instanceLabel?.[problem.id]?.[id] ?? "";
        const pName = `${pType?.name || "조각"} ${pNum}`.trim();
        announce(`${pName}을 조각함으로 되돌렸어요.`, `RETURN_${id}`);
      }

      const snap = makeSnapshot(res.pieces, nextRev, state.everSolved, null);
      if (snap) {
        saveQueueRef.current?.schedule(snap);
      }
    },
    [canEdit, makeSnapshot, pack, problem, state.boardRevision, state.everSolved, state.pieces],
  );

  const rotate = useCallback(
    (id: string) => {
      if (!canEdit || !pack || !problem) return;
      const res = rotatePiece(pack, problem, state.pieces, id);
      if (!res.ok) return;

      const nextRev = state.boardRevision + 1;
      dispatch({ type: "ROTATE", payload: { id } });

      const nextPiece = res.pieces.find((p) => p.instanceId === id);
      const pDef = problem.pieces.find((p) => p.id === id);
      const pType = pDef ? pack.typeById[pDef.typeId] : null;
      const pNum = pack.instanceLabel?.[problem.id]?.[id] ?? "";
      const pName = `${pType?.name || "조각"} ${pNum}`.trim();
      announce(`${pName}을 ${nextPiece?.rotation ?? 0}도로 돌렸어요.`, `ROTATE_${id}`);

      const snap = makeSnapshot(res.pieces, nextRev, state.everSolved, null);
      if (snap) {
        saveQueueRef.current?.schedule(snap);
      }
    },
    [canEdit, makeSnapshot, pack, problem, state.boardRevision, state.everSolved, state.pieces],
  );

  const check = useCallback(() => {
    if (!acquireLock()) return;
    if (!pack || !problem) return;
    if (!canCheck) return;

    dispatch({ type: "CHECK_START" });
    const currentRev = state.boardRevision;
    const t0 = performance.now();

    try {
      const res = evaluate(pack, problem, state.pieces, currentRev);
      const elapsed = performance.now() - t0;
      if (elapsed > 2000) {
        dispatch({
          type: "CHECK_RESULT",
          payload: {
            status: "system_error",
            code: "CHECK_FAILED",
            checkedRevision: currentRev,
          },
        });
        return;
      }
      if (elapsed > 1000 && process.env["NODE_ENV"] !== "production") {
        console.warn(`Evaluation took ${elapsed.toFixed(1)}ms for problem ${problem.id}`);
      }

      dispatch({
        type: "CHECK_RESULT",
        payload: {
          status: res.status,
          code: res.code,
          checkedRevision: res.checkedRevision,
        },
      });

      // 8-4: 성공은 모달 제목 포커스로 전달하므로 announcer 중복 금지. 그 외 오답/미완료만 announcer로 1회 알림
      if (res.status !== "correct") {
        const msg =
          (MESSAGES as Record<string, { text: string }>)[res.code]?.text ||
          "조건을 다시 확인해 보세요.";
        announce(msg, `CHECK_${res.code}`);
      }

      // 저장 큐 트리거
      if (res.status === "correct") {
        const snap = makeSnapshot(state.pieces, currentRev, true, {
          status: "correct",
          revision: currentRev,
        });
        if (snap) saveQueueRef.current?.now(snap);
      } else if (res.status === "incorrect" || res.status === "incomplete") {
        const snap = makeSnapshot(state.pieces, currentRev, state.everSolved, {
          status: res.status,
          revision: currentRev,
        });
        if (snap) saveQueueRef.current?.schedule(snap);
      }
      // system_error는 저장하지 않음
    } catch (err) {
      console.error("Evaluation exception:", err);
      dispatch({
        type: "CHECK_RESULT",
        payload: {
          status: "system_error",
          code: "CHECK_FAILED",
          checkedRevision: currentRev,
        },
      });
    }
  }, [canCheck, makeSnapshot, pack, problem, state.boardRevision, state.everSolved, state.pieces]);

  const reset = useCallback(() => {
    if (!acquireLock()) return;
    if (!problem) return;

    const isInitial =
      state.pieces.length === problem.initialPieces.length &&
      state.pieces.every((p: PieceState, idx: number) => {
        const init = problem.initialPieces[idx]!;
        return (
          p.instanceId === init.instanceId &&
          p.location === init.location &&
          p.rotation === init.rotation &&
          (p.location === "tray" ||
            (init.location === "board" &&
              p.cell.row === init.cell.row &&
              p.cell.col === init.cell.col))
        );
      });

    const nextRev = isInitial ? state.boardRevision : state.boardRevision + 1;

    dispatch({
      type: "RESET",
      payload: { initialPieces: problem.initialPieces },
    });

    const snap = makeSnapshot(problem.initialPieces, nextRev, state.everSolved, null);
    if (snap) {
      saveQueueRef.current?.now(snap);
    }
  }, [makeSnapshot, problem, state.boardRevision, state.everSolved, state.pieces]);

  const nextProblem = useCallback(async () => {
    const isSuccessModalOpen = state.modal === "success";
    const allowed = isSuccessModalOpen ? canNextInSuccessModal : canNext;
    if (!allowed) return;
    if (!acquireLock()) return;

    if (!nextProblemId) {
      // 마지막 문제 완료 -> finish 모달
      dispatch({ type: "OPEN_MODAL", payload: { kind: "finish" } });
      return;
    }

    if (isSuccessModalOpen) {
      dispatch({ type: "CLOSE_MODAL" });
    }
    dispatch({ type: "NAV_START" });

    try {
      await saveQueueRef.current?.flush(500);
      const prep = await (prepareFn ?? prepareProblem)(nextProblemId);
      preparedProblemCache.set(nextProblemId, prep);
      dispatch({ type: "NAV_DONE" });
      onNavigateNext?.(nextProblemId);
    } catch {
      dispatch({ type: "NAV_FAIL" });
      dispatch({
        type: "FEEDBACK",
        payload: {
          code: "NEXT_LOAD_FAILED",
          text: MESSAGES.NEXT_LOAD_FAILED.text,
        },
      });
    }
  }, [state.modal, canNextInSuccessModal, canNext, nextProblemId, prepareFn, onNavigateNext]);

  const openModal = useCallback((kind: ModalKind) => {
    dispatch({ type: "OPEN_MODAL", payload: { kind } });
  }, []);

  const closeModal = useCallback(() => {
    dispatch({ type: "CLOSE_MODAL" });
  }, []);

  const setTrayPage = useCallback((page: number) => {
    dispatch({ type: "SET_TRAY_PAGE", payload: { page } });
    announce(`조각함 ${page}쪽`, `TRAY_PAGE_${page}`);
  }, []);

  const focusCell = useCallback((cell: Cell) => {
    dispatch({ type: "FOCUS_CELL", payload: { cell } });
  }, []);

  const clearFeedback = useCallback(() => {
    dispatch({ type: "CLEAR_FEEDBACK" });
  }, []);

  return {
    state,
    pack,
    problem,
    // 파생 조건
    canEdit,
    canUseTools,
    canRotate,
    canReturn,
    canCheck,
    canNext,
    canNextInSuccessModal,
    selectedPiece,
    placedMovableCount,
    trayPieces,
    nextProblemId,
    // 동작
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
    clearFeedback,
  };
}
