import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { BoardCell } from "@/features/play/BoardCell";
import { Modal } from "@/components/game/Modal";
import { LiveAnnouncer } from "@/components/game/LiveAnnouncer";
import { announce, clearAnnounceHistory } from "@/services/a11y/liveAnnouncer";
import { PlayScreen } from "@/features/play/PlayScreen";

// tanstack router useNavigate & Link 모킹
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({
    children,
    href,
    to,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to?: string }) => (
    <a href={to || href || "#"} {...props}>
      {children}
    </a>
  ),
}));

describe("Phase 8: 접근성 (A11y, WCAG 2.2 AA) 검증", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearAnnounceHistory();
  });

  describe("8-1 & 8-2: Board, Cell, PieceCard ARIA 속성 및 Accessible Name", () => {
    it("BoardCell은 상세서 15.2 규격에 따라 정확한 accessible name을 가진다", () => {
      // 1. 빈칸
      const { rerender } = render(
        <BoardCell
          cell={{ row: 2, col: 3 }}
          isBlocked={false}
          isSelected={false}
          isFocused={false}
          onActivate={vi.fn()}
        />,
      );
      expect(screen.getByRole("gridcell", { name: "3행 4열, 빈칸" })).toBeInTheDocument();
      expect(screen.getByRole("gridcell")).toHaveAttribute("aria-colindex", "4");

      // 2. 가변 조각 배치 (0도, 미선택)
      rerender(
        <BoardCell
          cell={{ row: 2, col: 3 }}
          piece={{
            instanceId: "piece-1",
            location: "board",
            cell: { row: 2, col: 3 },
            rotation: 90,
          }}
          pieceName="파란 직선 조각 2"
          isBlocked={false}
          isSelected={false}
          isFocused={false}
          onActivate={vi.fn()}
        />,
      );
      expect(
        screen.getByRole("gridcell", { name: "3행 4열, 파란 직선 조각 2, 90도" }),
      ).toBeInTheDocument();

      // 3. 가변 조각 선택됨
      rerender(
        <BoardCell
          cell={{ row: 2, col: 3 }}
          piece={{
            instanceId: "piece-1",
            location: "board",
            cell: { row: 2, col: 3 },
            rotation: 90,
          }}
          pieceName="파란 직선 조각 2"
          isBlocked={false}
          isSelected={true}
          isFocused={false}
          onActivate={vi.fn()}
        />,
      );
      expect(
        screen.getByRole("gridcell", {
          name: "3행 4열, 파란 직선 조각 2, 90도, 선택됨",
        }),
      ).toBeInTheDocument();
      expect(screen.getByRole("gridcell")).toHaveAttribute("aria-selected", "true");

      // 4. 고정 조각
      rerender(
        <BoardCell
          cell={{ row: 0, col: 0 }}
          piece={{
            instanceId: "fixed-1",
            location: "board",
            cell: { row: 0, col: 0 },
            rotation: 0,
          }}
          pieceName="파란 직선 조각 1"
          isLocked={true}
          isBlocked={false}
          isSelected={false}
          isFocused={false}
          onActivate={vi.fn()}
        />,
      );
      expect(screen.getByRole("gridcell", { name: "1행 1열, 고정된 조각" })).toBeInTheDocument();

      // 5. 놓을 수 없는 금지칸
      rerender(
        <BoardCell
          cell={{ row: 1, col: 2 }}
          isBlocked={true}
          isSelected={false}
          isFocused={false}
          onActivate={vi.fn()}
        />,
      );
      expect(screen.getByRole("gridcell", { name: "2행 3열, 놓을 수 없음" })).toBeInTheDocument();
    });

    it("PlayScreen 보드는 role='grid'와 5개의 role='row'를 표준 계층으로 가진다", async () => {
      render(<PlayScreen problemId="p-001" />);

      await waitFor(() => {
        expect(screen.getByRole("grid", { name: /5행 5열/ })).toBeInTheDocument();
      });

      const grid = screen.getByRole("grid", { name: /5행 5열/ });
      expect(grid).toHaveAttribute("aria-rowcount", "5");
      expect(grid).toHaveAttribute("aria-colcount", "5");
      expect(grid).toHaveAttribute("aria-describedby", "pattern-desc");

      const rows = screen.getAllByRole("row");
      expect(rows).toHaveLength(5);
      rows.forEach((row, idx) => {
        expect(row).toHaveAttribute("aria-rowindex", String(idx + 1));
      });
    });
  });

  describe("8-3: Modal 접근성 및 포커스 관리", () => {
    function TestModalWrapper() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <div>
          <div id="app-root">
            <button id="trigger-btn" onClick={() => setIsOpen(true)}>
              모달 열기
            </button>
          </div>
          {isOpen && (
            <Modal
              title="도움말 모달"
              description="이것은 모달 설명입니다."
              onClose={() => setIsOpen(false)}
            >
              <div>
                <button id="modal-btn-1">첫 번째 버튼</button>
                <button id="modal-btn-2">두 번째 버튼</button>
              </div>
            </Modal>
          )}
        </div>
      );
    }

    it("모달 오픈 시 배경 inert 설정, 포커스 이동 및 닫힐 때 복원이 정상 동작한다", async () => {
      const user = userEvent.setup();
      render(<TestModalWrapper />);

      const triggerBtn = screen.getByRole("button", { name: "모달 열기" });
      const appRoot = document.getElementById("app-root");
      expect(appRoot).not.toHaveAttribute("inert");

      await user.click(triggerBtn);

      // 모달 열림 확인 및 inert 확인
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(appRoot).toHaveAttribute("inert");

      // aria-labelledby 및 aria-describedby 확인
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-labelledby");
      expect(dialog).toHaveAttribute("aria-describedby");
      expect(screen.getByText("도움말 모달")).toBeInTheDocument();
      expect(screen.getByText("이것은 모달 설명입니다.")).toBeInTheDocument();

      // 닫기 버튼 클릭하여 닫기
      const closeBtn = screen.getByRole("button", { name: "닫기" });
      await user.click(closeBtn);

      // 모달 닫힌 후 inert 제거 및 trigger 버튼으로 포커스 복원 확인
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(appRoot).not.toHaveAttribute("inert");
      expect(document.activeElement).toBe(triggerBtn);
    });

    it("모달 내에서 Escape 키 누르면 전파가 중단되며 모달이 닫힌다", async () => {
      const user = userEvent.setup();
      render(<TestModalWrapper />);

      await user.click(screen.getByRole("button", { name: "모달 열기" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      await user.keyboard("{Escape}");

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("8-4: LiveAnnouncer 스크린리더 알림 및 중복 억제", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("announce 호출 시 LiveAnnouncer에 메시지가 전달되고 1초 내 동일 code는 중복 방지된다", () => {
      render(<LiveAnnouncer />);

      const announcer = screen.getByRole("status");
      expect(announcer).toHaveTextContent("");

      // 1. 첫 번째 공지
      act(() => {
        announce("파란 직선 조각 1 선택됨", "SELECT_p1");
      });
      expect(announcer).toHaveTextContent("파란 직선 조각 1 선택됨");

      // 2. 1초 이내 동일 code 호출 -> 갱신되지 않아야 함
      act(() => {
        announce("파란 직선 조각 1 중복 선택됨", "SELECT_p1");
      });
      expect(announcer).toHaveTextContent("파란 직선 조각 1 선택됨");

      // 3. 500ms 경과 후 다른 code 호출 -> 즉시 반영
      act(() => {
        vi.advanceTimersByTime(500);
        announce("조각함 2쪽", "TRAY_PAGE_2");
      });
      expect(announcer).toHaveTextContent("조각함 2쪽");

      // 4. 1000ms 추가 경과 (총 1500ms) 후 동일 code 재호출 -> 정상 반영
      act(() => {
        vi.advanceTimersByTime(1000);
        announce("파란 직선 조각 1 다시 선택됨", "SELECT_p1");
      });
      expect(announcer).toHaveTextContent("파란 직선 조각 1 다시 선택됨");
    });
  });
});
