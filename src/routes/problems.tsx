import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/game/Badge";
import { Button } from "@/components/game/Button";
import { Skeleton } from "@/components/game/Skeleton";
import { PatternImage } from "@/components/game/art/registry";
import type { ResolvedPack } from "@/domain/types";
import { useProgressSummary } from "@/features/progress/useProgressSummary";
import { contentRepository } from "@/services/content/ContentRepository";

export const Route = createFileRoute("/problems")({
  head: () => ({
    meta: [
      { title: "문제 고르기 — 생각 연결 보드" },
      {
        name: "description",
        content: "풀고 싶은 연결 문제를 골라요. 모든 문제를 처음부터 선택할 수 있어요.",
      },
      { property: "og:title", content: "문제 고르기 — 생각 연결 보드" },
      { property: "og:description", content: "15개의 연결 문제 중 하나를 골라 풀어요." },
    ],
  }),
  component: ProblemList,
});

export function ProblemList() {
  const [pack, setPack] = useState<ResolvedPack | null>(null);
  const [failedProblemIds, setFailedProblemIds] = useState<Set<string>>(new Set());
  const [selectedStage, setSelectedStage] = useState<number | "all">("all");

  const fetchPack = () => {
    contentRepository
      .getPack()
      .then((p) => {
        setPack(p);
      })
      .catch(() => {
        setPack(null);
      });
  };

  useEffect(() => {
    fetchPack();
  }, []);

  // 풀이에서 목록 복귀 시 스크롤 복원 (7-3)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = sessionStorage.getItem("cb:list-scroll");
    if (saved) {
      sessionStorage.removeItem("cb:list-scroll");
      const y = parseInt(saved, 10);
      if (!Number.isNaN(y)) {
        window.scrollTo({ top: y, behavior: "instant" });
      }
    }
  }, [pack]);

  const saveScrollBeforeNav = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("cb:list-scroll", String(window.scrollY));
    }
  };

  const handleRetryProblem = (problemId: string) => {
    contentRepository.reset();
    setFailedProblemIds((prev) => {
      const next = new Set(prev);
      next.delete(problemId);
      return next;
    });
    fetchPack();
  };

  const summary = useProgressSummary(pack);

  if (!pack) {
    return (
      <div className="min-h-dvh flex flex-col bg-[#FDFBF7]">
        <header className="mx-auto grid h-16 max-w-[1280px] w-full grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 md:h-[72px] wide:px-6">
          <Link
            to="/"
            className="btn btn-toy-secondary justify-self-start min-h-[48px] h-12 px-5 text-base font-bold"
          >
            처음으로
          </Link>
          <h1 className="t-page font-extrabold text-slate-800">문제 고르기</h1>
          <div className="justify-self-end w-28 h-8 animate-pulse bg-slate-200 rounded-full" />
        </header>
        <main className="mx-auto max-w-[1280px] w-full px-4 pb-8 wide:px-6">
          <p className="t-child mt-3 mb-6 text-slate-500 font-medium">풀고 싶은 문제를 골라요.</p>
          <div className="grid grid-cols-1 gap-5 tab:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} delay={300} className="min-h-[260px] rounded-3xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // 문제 필터링 (단계별)
  const filteredProblems = pack.orderedProblems.filter((p) => {
    if (selectedStage === "all") return true;
    if (selectedStage === 1) return p.order >= 1 && p.order <= 4;
    if (selectedStage === 2) return p.order >= 5 && p.order <= 8;
    if (selectedStage === 3) return p.order >= 9 && p.order <= 12;
    if (selectedStage === 4) return p.order >= 13 && p.order <= 15;
    return true;
  });

  return (
    <div className="min-h-dvh flex flex-col bg-[#FDFBF7]">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-[#FDFBF7]/90 border-b border-amber-100 mx-auto grid h-16 max-w-[1280px] w-full grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 md:h-[72px] wide:px-6">
        <Link
          to="/"
          className="btn btn-toy-secondary justify-self-start min-h-[44px] h-11 px-4 text-base font-bold shadow-sm"
        >
          <span>🏠</span> 처음으로
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xl">🧭</span>
          <h1 className="t-page font-extrabold text-slate-900 tracking-tight">문제 고르기</h1>
        </div>
        <div className="justify-self-end flex items-center gap-2 rounded-full bg-amber-100/80 px-3.5 py-1.5 border border-amber-200">
          <span className="text-amber-500 text-sm">⭐</span>
          <span className="t-label tabular font-extrabold text-amber-900 text-sm md:text-base">
            풀어 본 문제 {summary.solvedCount} / {summary.totalCount}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] w-full px-4 pb-12 wide:px-6 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4 mb-6">
          <p className="t-child text-slate-700 font-semibold">
            풀고 싶은 문제를 골라요.{" "}
            <span className="text-sm font-normal text-slate-500">
              모든 문제는 언제든 자유롭게 풀 수 있어요!
            </span>
          </p>

          {/* 스테이지 탭 필터 */}
          <div
            className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none"
            role="tablist"
            aria-label="난이도 단계 선택"
          >
            {[
              { id: "all" as const, label: "전체 🌟" },
              { id: 1, label: "1단계 🌱" },
              { id: 2, label: "2단계 🌿" },
              { id: 3, label: "3단계 🌊" },
              { id: 4, label: "4단계 👑" },
            ].map((tab) => {
              const isActive = selectedStage === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setSelectedStage(tab.id)}
                  className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-300"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <ul className="grid grid-cols-1 gap-5 tab:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
          {filteredProblems.map((p) => {
            const isFailed = failedProblemIds.has(p.id);
            if (isFailed) {
              return (
                <li key={p.id}>
                  <div className="card-toy flex min-h-[260px] flex-col items-center justify-center p-5 border-2 border-red-200 bg-red-50/50 text-center">
                    <AlertCircle className="w-10 h-10 text-red-500 mb-2" aria-hidden="true" />
                    <span className="t-label tabular font-bold mb-1 text-slate-700">
                      문제 {p.order}
                    </span>
                    <p className="text-sm font-bold text-red-700 mb-3">문제를 준비하지 못했어요</p>
                    <Button
                      variant="secondary"
                      onClick={() => handleRetryProblem(p.id)}
                      className="min-h-[44px] h-11 px-5 text-sm font-bold shadow-sm"
                    >
                      다시 시도
                    </Button>
                  </div>
                </li>
              );
            }

            const pStatus = summary.problemStatus[p.id] ?? "not_started";
            const isSolved = pStatus === "solved";
            const statusLabel =
              pStatus === "solved"
                ? "다시 살펴보기"
                : pStatus === "in_progress"
                  ? "이어서 풀기"
                  : "시작하기";

            // 난이도 별점 계산
            const stars = p.order <= 4 ? 1 : p.order <= 12 ? 2 : 3;

            return (
              <li key={p.id}>
                <Link
                  to="/play/$problemId"
                  params={{ problemId: p.id }}
                  onClick={saveScrollBeforeNav}
                  className={`card-toy flex min-h-[260px] flex-col p-5 bg-white transition-all duration-150 ${
                    isSolved
                      ? "border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/20"
                      : "border-slate-200 hover:border-amber-400 hover:bg-amber-50/15"
                  }`}
                >
                  {/* 상단 라벨 및 뱃지 영역 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-7 px-2.5 items-center justify-center rounded-full bg-slate-100 font-extrabold text-xs text-slate-700 tabular">
                        문제 {p.order}
                      </span>
                      <span className="text-xs text-amber-500" title={`난이도 ${stars}단계`}>
                        {"★".repeat(stars)}
                        {"☆".repeat(3 - stars)}
                      </span>
                    </div>
                    {isSolved && <Badge>풀었어요</Badge>}
                  </div>

                  {/* 도안 프리뷰 이미지 */}
                  <div className="my-3.5 flex items-center justify-center p-2 rounded-2xl bg-amber-50/40 border border-amber-100/60">
                    <PatternImage
                      problem={p}
                      className="aspect-square w-full max-w-36 transition-transform duration-200 hover:scale-105"
                    />
                  </div>

                  {/* 문제 타이틀 */}
                  <h2 className="t-section text-slate-900 font-bold tracking-tight line-clamp-1">
                    {p.title}
                  </h2>

                  {/* 하단 상태 액션 바 */}
                  <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span
                      className={`text-sm md:text-base font-extrabold ${
                        isSolved
                          ? "text-emerald-600"
                          : pStatus === "in_progress"
                            ? "text-amber-600"
                            : "text-blue-600"
                      }`}
                    >
                      {statusLabel}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {isSolved ? "✨ 완료" : "▶ 도전"}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
