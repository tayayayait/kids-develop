import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import React from "react";
import { Modal } from "@/components/game/Modal";

interface FinishModalProps {
  onClose: () => void;
  everSolvedCount?: number;
  total?: number;
}

export function FinishModal({ onClose, everSolvedCount = 0, total = 0 }: FinishModalProps) {
  const isAllSolved = total > 0 && everSolvedCount >= total;
  const title = isAllSolved ? "모든 문제를 풀었어요!" : "마지막 문제를 풀었어요!";
  const description = isAllSolved
    ? "도안을 보고 연결하는 방법을 찾아냈어요."
    : `아직 풀지 않은 문제 ${Math.max(0, total - everSolvedCount)}개가 있어요.`;

  return (
    <Modal title={title} description={description} onClose={onClose}>
      <div className="text-center py-2">
        <div className="mx-auto mb-2 h-14 w-14 rounded-full bg-[var(--success-bg)] flex items-center justify-center text-[var(--success)]">
          <Check className="h-8 w-8" aria-hidden="true" />
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <Link to="/problems" className="btn btn-primary w-full text-center" autoFocus>
          {isAllSolved ? "문제 목록으로" : "다른 문제 고르기"}
        </Link>
      </div>
    </Modal>
  );
}
