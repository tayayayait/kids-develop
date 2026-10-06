import React from "react";
import { Modal } from "@/components/game/Modal";
import { Button } from "@/components/game/Button";

interface ResetModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

export function ResetModal({ onClose, onConfirm }: ResetModalProps) {
  return (
    <Modal
      title="처음부터 다시 할까요?"
      description="놓은 조각은 처음 상태로 돌아가요."
      onClose={onClose}
    >
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" autoFocus className="min-w-32" onClick={onClose}>
          계속 풀기
        </Button>
        <Button
          variant="primary"
          className="min-w-32"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          다시 하기
        </Button>
      </div>
    </Modal>
  );
}
