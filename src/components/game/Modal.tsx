import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { IconButton } from "@/components/game/IconButton";

export interface ModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  initialFocusSelector?: string;
}

export function Modal({
  title,
  description,
  onClose,
  children,
  width = 480,
  initialFocusSelector,
}: ModalProps) {
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descId = `${baseId}-desc`;

  const dialogRef = useRef<HTMLDivElement>(null);
  const prevActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;

    // 1. 이전 포커스 저장
    prevActiveRef.current = document.activeElement as HTMLElement | null;

    // 2. 배경 inert 및 스크롤 잠금
    const appRoot = document.getElementById("app-root");
    if (appRoot) {
      appRoot.setAttribute("inert", "");
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // 3. 초기 포커스 이동 (data-autofocus -> initialFocusSelector -> 첫 focusable 버튼)
    const dialog = dialogRef.current;
    if (dialog) {
      const target =
        (initialFocusSelector ? dialog.querySelector<HTMLElement>(initialFocusSelector) : null) ??
        dialog.querySelector<HTMLElement>("[data-autofocus]") ??
        dialog.querySelector<HTMLElement>("button:not([aria-label='닫기'])") ??
        dialog.querySelector<HTMLElement>(
          "button, [href], input, select, textarea, [tabindex='0']",
        );
      target?.focus();
    }

    // 4. 키보드 이벤트 (Escape 중단 및 Tab 포커스 트랩)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === "Tab" && dialog) {
        const focusables = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => el.offsetParent !== null || el.getClientRects().length > 0);

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;

        if (e.shiftKey) {
          if (document.activeElement === first || !dialog.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !dialog.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", onKeyDown, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);

      // 스크롤 및 inert 복원
      document.body.style.overflow = originalOverflow;
      if (appRoot) {
        appRoot.removeAttribute("inert");
      }

      // 포커스 복원 (기존 요소가 DOM에 남아 있으면 그곳으로, 없으면 #play-title)
      const prev = prevActiveRef.current;
      if (prev && document.contains(prev)) {
        prev.focus();
      } else {
        const playTitle = document.getElementById("play-title");
        playTitle?.focus();
      }
    };
  }, [onClose, initialFocusSelector]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="shadow-modal relative z-[110] max-h-[calc(100dvh-48px)] w-full overflow-y-auto rounded-xl bg-card p-6"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute right-3 top-3">
          <IconButton
            aria-label="닫기"
            variant="ghost"
            icon={<X className="h-6 w-6" />}
            onClick={onClose}
          />
        </div>

        <h2 id={titleId} className="t-page mb-3 pr-12 text-[var(--foreground)]">
          {title}
        </h2>

        {description && (
          <p id={descId} className="t-child mb-4 text-[var(--muted-foreground)]">
            {description}
          </p>
        )}

        {children}
      </div>
    </div>,
    document.body,
  );
}
