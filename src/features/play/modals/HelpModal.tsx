import React from "react";
import { Check, RotateCw } from "lucide-react";
import { Modal } from "@/components/game/Modal";
import { PieceArt } from "@/components/game/Visuals";
import { Button } from "@/components/game/Button";

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  return (
    <Modal title="이렇게 풀어요" onClose={onClose} width={560}>
      <ol className="space-y-4">
        {[
          "조각을 눌러 고른 뒤 빈칸을 눌러요.",
          "조각을 끌어 놓아도 돼요.",
          "돌리고 옮긴 뒤 확인하기를 눌러요.",
        ].map((t, i) => (
          <li key={t} className="flex items-center gap-3 rounded-lg bg-secondary p-3">
            <span className="t-label grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              {i + 1}
            </span>
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-md bg-card">
              {i === 0 ? (
                <Check className="h-8 w-8 text-primary" />
              ) : i === 1 ? (
                <PieceArt shape="corner" rotation={0} className="h-12 w-12" />
              ) : (
                <RotateCw className="h-8 w-8 text-primary" />
              )}
            </span>
            <span className="t-child">
              {i + 1}. {t}
            </span>
          </li>
        ))}
      </ol>
      <Button variant="primary" autoFocus className="mt-4 w-full" onClick={onClose}>
        알겠어요
      </Button>
    </Modal>
  );
}
