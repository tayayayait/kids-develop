import React, { useEffect, useRef } from "react";
import { ZoomIn } from "lucide-react";
import { IconButton } from "@/components/game/IconButton";
import { PatternImage } from "@/components/game/art/registry";
import type { Problem } from "@/domain/types";

interface PatternPanelProps {
  problem: Problem;
  mode?: "three-column" | "stacked" | "narrow";
  onOpenZoom: () => void;
  onHeightChange?: (height: number) => void;
}

export function PatternPanel({
  problem,
  mode = "three-column",
  onOpenZoom,
  onHeightChange,
}: PatternPanelProps) {
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!panelRef.current || !onHeightChange || typeof ResizeObserver === "undefined") return;
    const el = panelRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        onHeightChange(entry.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [onHeightChange]);

  if (mode === "stacked" || mode === "narrow") {
    // 세로 도안 요약 (최소 112px, 이미지 96x96, 간격 16px, 크게 보기 버튼)
    return (
      <section
        ref={panelRef}
        aria-labelledby="pattern-title"
        data-keep-selection="true"
        className="min-h-[112px] p-2.5 bg-white rounded-3xl border-2 border-amber-200/80 shadow-sm flex items-center gap-4 transition-all"
      >
        <div className="relative w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-amber-50/50 flex items-center justify-center border-2 border-amber-100 p-1">
          <PatternImage problem={problem} className="w-full h-full object-contain" />
          <IconButton
            aria-label="도안 크게 보기"
            icon={<ZoomIn className="w-5 h-5 text-[var(--foreground)]" />}
            onClick={onOpenZoom}
            className="absolute bottom-1 right-1 w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg bg-[var(--card)]/90 shadow-sm border border-[var(--border)] hover:bg-[var(--card)]"
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h2 id="pattern-title" className="text-lg font-bold text-[var(--foreground)] truncate">
            {problem.title}
          </h2>
          <ul className="mt-1 space-y-0.5 text-sm font-medium text-[var(--muted-foreground)]">
            {problem.prompt.slice(0, 3).map((t, idx) => (
              <li key={idx} className="truncate">
                · {t}
              </li>
            ))}
          </ul>
          <p id="pattern-desc" className="text-xs text-[var(--muted-foreground)] mt-1 truncate">
            {problem.pattern.description}
          </p>
        </div>
      </section>
    );
  }

  // 3열 가로 풀이 도안 패널 (폭 240px, padding 16px, 도안 208x208, 조건)
  return (
    <section
      ref={panelRef}
      aria-labelledby="pattern-title"
      data-keep-selection="true"
      className="w-[240px] min-w-[240px] p-4 bg-white rounded-3xl border-2 border-amber-200/80 shadow-sm flex flex-col gap-3 transition-all"
    >
      <div className="flex items-center justify-between">
        <h2 id="pattern-title" className="text-xl font-extrabold text-slate-800 tracking-tight">
          {problem.title}
        </h2>
        <IconButton
          aria-label="도안 크게 보기"
          icon={<ZoomIn className="w-5 h-5 text-amber-700" />}
          onClick={onOpenZoom}
          className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-amber-50 border border-amber-200"
        />
      </div>

      <div className="w-full aspect-square max-w-[208px] mx-auto rounded-2xl overflow-hidden bg-amber-50/50 flex items-center justify-center border-2 border-amber-100 p-2 shadow-inner">
        <PatternImage problem={problem} className="w-full h-full object-contain" />
      </div>

      <div className="min-w-0 mt-1">
        <span className="text-xs font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full inline-block mb-2">
          🌟 문제 조건
        </span>
        <ul className="space-y-1.5 text-base font-semibold text-slate-700 leading-relaxed">
          {problem.prompt.map((t, idx) => (
            <li key={idx} className="break-keep flex items-start gap-1">
              <span className="text-emerald-500 font-bold">•</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <p id="pattern-desc" className="text-xs text-slate-400 mt-2 leading-normal break-keep">
          {problem.pattern.description}
        </p>
      </div>
    </section>
  );
}
