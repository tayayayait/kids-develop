import React from "react";
import { Modal } from "@/components/game/Modal";
import { PatternImage } from "@/components/game/art/registry";
import { Button } from "@/components/game/Button";
import type { Problem } from "@/domain/types";

interface PatternModalProps {
  problem: Problem;
  onClose: () => void;
}

export function PatternModal({ problem, onClose }: PatternModalProps) {
  return (
    <Modal title={problem.title} description="도안 크게 보기" onClose={onClose} width={720}>
      <PatternImage
        problem={problem}
        className="mx-auto aspect-square w-full max-w-[min(560px,calc(100dvh-260px))] min-w-40"
      />
      <ul className="t-child mt-4 space-y-1">
        {problem.prompt.map((t, idx) => (
          <li key={idx}>· {t}</li>
        ))}
      </ul>
      <p className="mt-2 text-muted-foreground">{problem.pattern.description}</p>
      <Button variant="secondary" autoFocus className="mt-6 w-full" onClick={onClose}>
        닫기
      </Button>
    </Modal>
  );
}
