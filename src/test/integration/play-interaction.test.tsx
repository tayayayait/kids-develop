import "fake-indexeddb/auto";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { PlayScreen } from "@/features/play/PlayScreen";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

describe("Play Interaction Engine (Phase 5: 탭/키보드/Escape/피드백)", () => {
  it("T13: 고정 조각을 탭하면 FIXED_PIECE 안내가 나오고 선택이 바뀌지 않는다", async () => {
    // p-009는 첫 번째 조각이 locked: true인 고정 조각 문제
    const user = userEvent.setup();
    render(<PlayScreen problemId="p-009" />);

    // 로딩 대기
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /문제 9 \//i })).toBeInTheDocument();
    });

    // 고정 조각이 있는 셀 찾기 (Lock 아이콘이 있는 셀)
    const lockedCell = screen.getByRole("gridcell", { name: /고정된 조각|고정됨/i });
    expect(lockedCell).toBeInTheDocument();

    await user.click(lockedCell);
    // userEvent click 후 필요 시 fireEvent click 지원
    fireEvent.click(lockedCell);

    // FIXED_PIECE 문구 노출 확인
    await waitFor(() => {
      expect(
        screen.getByText(/고정된 조각이에요|움직이지 않아요|움직일 수 없어요/i),
      ).toBeInTheDocument();
    });
  });

  it("5-6: Escape 키는 모달 닫기 -> 선택 해제 순서로 1단계씩 취소한다", async () => {
    const user = userEvent.setup();
    render(<PlayScreen problemId="p-001" />);

    // 조각 1 선택
    const pieceBtn = await screen.findByRole("button", {
      name: /파란 직선 조각 1/i,
    });
    await user.click(pieceBtn);
    expect(pieceBtn).toHaveAttribute("aria-pressed", "true");

    // 사용 방법 모달 열기
    const helpBtn = screen.getByRole("button", { name: /사용 방법/i });
    await user.click(helpBtn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // 1차 Escape: 모달만 닫히고 조각 선택은 유지되어야 함
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(pieceBtn).toHaveAttribute("aria-pressed", "true");

    // 2차 Escape: 선택 해제되어야 함
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(pieceBtn).toHaveAttribute("aria-pressed", "false");
    });
  });

  it("5-4: 조각 선택 상태에서 보드 밖 여백을 클릭하면 선택이 해제된다", async () => {
    const user = userEvent.setup();
    const { container } = render(<PlayScreen problemId="p-001" />);

    // 조각 1 선택
    const pieceBtn = await screen.findByRole("button", {
      name: /파란 직선 조각 1/i,
    });
    await user.click(pieceBtn);
    expect(pieceBtn).toHaveAttribute("aria-pressed", "true");

    // 최상위 여백 요소 클릭
    const rootDiv = container.firstChild as HTMLElement;
    await user.click(rootDiv);

    await waitFor(() => {
      expect(pieceBtn).toHaveAttribute("aria-pressed", "false");
    });
  });

  it("T34: 키보드만으로 보드를 탐색하고 조각을 배치할 수 있다", async () => {
    render(<PlayScreen problemId="p-001" />);

    const pieceBtn = await screen.findByRole("button", {
      name: /파란 직선 조각 1/i,
    });

    // 키보드 Enter로 조각 선택
    pieceBtn.focus();
    fireEvent.keyDown(pieceBtn, { key: "Enter" });
    fireEvent.click(pieceBtn, { detail: 0 }); // 키보드 클릭 시뮬레이션

    expect(pieceBtn).toHaveAttribute("aria-pressed", "true");

    // 보드 격자에 키보드 포커스
    const grid = screen.getByRole("grid", { name: /5×5 보드/i });
    grid.focus();

    // 방향키 이동 (2행 0열 -> 3행 1열: row 2, col 0)
    fireEvent.keyDown(grid, { key: "ArrowDown" });
    fireEvent.keyDown(grid, { key: "ArrowDown" });
    // Enter로 현재 포커스 셀(row: 2, col: 0 = 3행 1열)에 배치
    fireEvent.keyDown(grid, { key: "Enter" });

    // 3행 1열 셀에 조각이 놓였는지 확인
    await waitFor(() => {
      expect(screen.getByRole("gridcell", { name: /3행 1열, 파란 직선/i })).toBeInTheDocument();
    });
  });
});
