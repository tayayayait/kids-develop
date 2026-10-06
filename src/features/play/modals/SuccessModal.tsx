import React from "react";
import { Check } from "lucide-react";
import { Modal } from "@/components/game/Modal";
import { Button } from "@/components/game/Button";

interface SuccessModalProps {
  canNext: boolean;
  isLastProblem: boolean;
  onClose: () => void;
  onNext: () => void;
}

export function SuccessModal({ canNext, isLastProblem, onClose, onNext }: SuccessModalProps) {
  return (
    <Modal title="해냈어요!" description="문제의 조건을 모두 맞췄어요." onClose={onClose}>
      <div className="text-center py-3">
        <div className="relative inline-block mx-auto mb-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 text-3xl shadow-md ring-4 ring-emerald-200">
            🎉
          </div>
          <span className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-sm shadow ring-2 ring-white animate-bounce">
            ⭐
          </span>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-2xl text-amber-400 my-1">
          <span>⭐</span>
          <span className="scale-125">⭐</span>
          <span>⭐</span>
        </div>
        <p className="text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full inline-block mt-1">
          길이 완벽하게 연결되었어요!
        </p>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button variant="secondary" className="min-w-32" onClick={onClose}>
          돌아보기
        </Button>
        <Button
          variant="primary"
          autoFocus
          className="min-w-32"
          disabled={!canNext}
          onClick={() => {
            onClose();
            onNext();
          }}
        >
          {isLastProblem ? "학습 마치기" : "다음 문제"}
        </Button>
      </div>
    </Modal>
  );
}
