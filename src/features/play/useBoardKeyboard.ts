import React, { useCallback } from "react";
import { nextFocus } from "@/domain/layout/keyboardNav";
import type { Cell } from "@/domain/types";

export interface UseBoardKeyboardOptions {
  focusedCell: Cell;
  onFocusCell: (cell: Cell) => void;
  onActivateCell: (cell: Cell) => void;
  gridElement: HTMLElement | null;
}

export function useBoardKeyboard({
  focusedCell,
  onFocusCell,
  onActivateCell,
  gridElement,
}: UseBoardKeyboardOptions) {
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      const key = event.key;

      if (
        key === "ArrowUp" ||
        key === "ArrowDown" ||
        key === "ArrowLeft" ||
        key === "ArrowRight" ||
        key === "Home" ||
        key === "End"
      ) {
        event.preventDefault();
        const next = nextFocus(focusedCell, key, event.ctrlKey);
        onFocusCell(next);

        // 해당 셀 DOM 요소로 포커스 이동 (roving tabindex)
        if (gridElement) {
          const targetEl = gridElement.querySelector<HTMLElement>(
            `[data-cell="${next.row}-${next.col}"]`,
          );
          if (targetEl) {
            targetEl.focus();
            try {
              targetEl.scrollIntoView({ block: "nearest" });
            } catch {
              // ignore
            }
          }
        }
        return;
      }

      if (key === "Enter" || key === " ") {
        event.preventDefault();
        onActivateCell(focusedCell);
      }
    },
    [focusedCell, gridElement, onActivateCell, onFocusCell],
  );

  return { onKeyDown };
}
