import React from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/game/Button";

interface PlayHeaderProps {
  order: number;
  total: number;
  titleRef?: React.RefObject<HTMLHeadingElement | null>;
  onOpenHelp: () => void;
  onBeforeLeave?: () => void;
}

export function PlayHeader({ order, total, titleRef, onOpenHelp, onBeforeLeave }: PlayHeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-[#FDFBF7]/95 backdrop-blur-md border-b border-amber-100/80">
      <div className="mx-auto flex flex-wrap min-h-16 h-auto max-w-[1280px] items-center justify-between gap-3 px-4 py-2 md:h-[72px] wide:px-6">
        <Link
          to="/problems"
          onClick={onBeforeLeave}
          className="btn btn-toy-secondary min-w-[112px] h-12 min-h-[48px] md:h-14 md:min-h-[56px] text-base font-bold shadow-sm"
        >
          <span>🧭</span> 문제 목록
        </Link>

        <h1
          ref={titleRef}
          id="play-title"
          tabIndex={-1}
          className="t-section tabular text-center font-extrabold outline-none text-slate-800 bg-amber-100/70 border border-amber-200/80 px-4 py-1.5 rounded-full"
        >
          문제 {order} / {total}
        </h1>

        <Button
          variant="secondary"
          onClick={() => {
            onBeforeLeave?.();
            onOpenHelp();
          }}
          className="btn-toy-secondary min-w-[112px] h-12 min-h-[48px] md:h-14 md:min-h-[56px] text-base font-bold shadow-sm"
        >
          <span>💡</span> 사용 방법
        </Button>
      </div>
    </header>
  );
}
