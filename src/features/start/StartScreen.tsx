import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/game/Button";
import { ErrorPanel } from "@/components/game/ErrorPanel";
import { Skeleton } from "@/components/game/Skeleton";
import type { ResolvedPack } from "@/domain/types";
import { useProgressSummary } from "@/features/progress/useProgressSummary";
import { contentRepository } from "@/services/content/ContentRepository";

function BoardIntroGraphic() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto mb-6 h-44 w-44 rounded-3xl border-4 border-amber-200/80 bg-gradient-to-b from-amber-50 to-orange-50/40 p-3 shadow-[0_12px_24px_rgba(245,158,11,0.15)] select-none"
    >
      <div className="grid h-full w-full grid-cols-5 grid-rows-5 gap-1.5 p-1 rounded-2xl bg-white/80 border border-amber-100">
        {Array.from({ length: 25 }, (_, i) => {
          const isPath = [6, 7, 8, 13, 18].includes(i);
          const isEndpoint = i === 6 || i === 18;
          return (
            <div
              key={i}
              className={`rounded-lg transition-all flex items-center justify-center ${
                isPath
                  ? isEndpoint
                    ? "bg-amber-400 text-white shadow-sm ring-2 ring-amber-300 font-black text-[10px]"
                    : "bg-emerald-400 shadow-sm"
                  : "border border-slate-100 bg-slate-50/60"
              }`}
            >
              {isEndpoint && "★"}
            </div>
          );
        })}
      </div>
      {/* 귀여운 떠다니는 장식 뱃지 */}
      <span className="absolute -top-3 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-sm shadow-md ring-2 ring-white">
        ✨
      </span>
      <span className="absolute -bottom-2 -left-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400 text-xs shadow-md ring-2 ring-white text-white">
        🧩
      </span>
    </div>
  );
}

export function StartScreen() {
  const [pack, setPack] = useState<ResolvedPack | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error" | "empty">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPack = () => {
    setLoadState("loading");
    contentRepository
      .getPack()
      .then((p) => {
        if (!p || p.orderedProblems.length === 0) {
          setPack(p);
          setLoadState("empty");
        } else {
          setPack(p);
          setLoadState("ready");
        }
      })
      .catch((err) => {
        setErrorMsg(err instanceof Error ? err.message : "CONTENT_INVALID");
        setLoadState("error");
      });
  };

  useEffect(() => {
    fetchPack();
  }, []);

  const summary = useProgressSummary(pack);
  const progressPercent =
    summary.totalCount > 0 ? Math.round((summary.solvedCount / summary.totalCount) * 100) : 0;

  return (
    <div className="min-h-dvh flex flex-col bg-[#FDFBF7] relative overflow-hidden">
      {/* 배경 장식 원형 파스텔 버블 */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-amber-100/50 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-emerald-100/50 blur-3xl"
        aria-hidden="true"
      />

      <header className="relative z-10 mx-auto flex h-16 max-w-[1280px] w-full items-center justify-between px-4 md:h-[72px] wide:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400 text-lg shadow-sm">
            🧩
          </span>
          <span className="t-section font-bold tracking-tight text-slate-800">
            {pack?.title ?? "생각 연결 보드"}
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
          🌱 어린이 두뇌 탐험
        </span>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6 wide:px-6">
        {loadState === "loading" && (
          <div className="card-toy w-full max-w-[640px] p-6 text-center wide:p-8">
            <Skeleton delay={300} className="mx-auto mb-6 h-44 w-44 rounded-3xl" />
            <Skeleton delay={300} className="mx-auto mb-3 h-10 w-3/4 rounded-xl" />
            <Skeleton delay={300} className="mx-auto mb-6 h-6 w-1/2 rounded-lg" />
            <Skeleton delay={300} className="mx-auto mb-6 h-6 w-1/3 rounded-lg" />
            <Skeleton delay={300} className="h-14 w-full rounded-2xl" />
          </div>
        )}

        {loadState === "empty" && (
          <ErrorPanel
            title="아직 준비된 문제가 없어요."
            description="문제를 불러오지 못했거나 등록된 문제가 없습니다."
            actions={
              <Button variant="primary" onClick={fetchPack} className="min-w-[144px]">
                다시 확인
              </Button>
            }
          />
        )}

        {loadState === "error" && (
          <ErrorPanel
            title="문제를 준비하지 못했어요."
            description="문제 자료를 불러오는 중 오류가 발생했습니다."
            code={errorMsg ?? undefined}
            actions={
              <Button variant="primary" onClick={fetchPack} className="min-w-[144px]">
                다시 시도
              </Button>
            }
          />
        )}

        {loadState === "ready" && pack && (
          <div className="card-toy w-full max-w-[640px] p-7 text-center wide:p-10 bg-white">
            <BoardIntroGraphic />
            <h1 className="t-display mb-3 text-slate-900 font-extrabold tracking-tight">
              조각을 움직이며 문제를 풀어요
            </h1>
            <p className="t-child mb-6 text-slate-600 font-medium">
              도안을 보고 조각을 놓고 돌려 보세요.
            </p>

            {/* 진행 상황 프로그레스 카드 */}
            <div className="mb-8 rounded-2xl bg-amber-50/60 p-4 border border-amber-200/60 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-sm font-bold text-amber-900">
                  <span>⭐ 나의 모험 진행도</span>
                </span>
                <span className="t-label tabular font-extrabold text-amber-800">
                  풀어 본 문제 {summary.solvedCount} / {summary.totalCount}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-amber-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {summary.lastProblemId ? (
              <div className="flex flex-col gap-3.5">
                <Link
                  to="/play/$problemId"
                  params={{ problemId: summary.lastProblemId }}
                  className="btn btn-toy-primary min-h-[58px] text-lg font-bold shadow-md"
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true">🚀</span> 이어 하기
                  </span>
                </Link>
                <Link
                  to="/problems"
                  className="btn btn-toy-secondary min-h-[56px] text-lg font-bold"
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true">🧭</span> 문제 고르기
                  </span>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                <Link
                  to="/problems"
                  className="btn btn-toy-primary min-h-[58px] text-lg font-bold shadow-md"
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true">✨</span> 문제 시작
                  </span>
                </Link>
              </div>
            )}

            {summary.isStorageUnavailable && (
              <p
                className="mt-4 text-sm md:text-base font-semibold text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200"
                role="status"
              >
                이 기기에서는 풀이가 저장되지 않아요. 지금 문제는 계속 풀 수 있어요.
              </p>
            )}

            {pack.purpose === "development" && (
              <p className="mt-6 text-xs md:text-sm text-slate-400 tabular-nums">
                개발용 문제 묶음 ({pack.contentVersion})
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
