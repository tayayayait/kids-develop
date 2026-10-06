import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { PlayScreen } from "@/features/play/PlayScreen";

// tanstack router useNavigate 모킹
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

describe("PlayScreen Basic Integration (p-001)", () => {
  it("p-001에서 조각 5개를 배치하고 확인하기를 누르면 성공 모달이 뜬다", async () => {
    const user = userEvent.setup();
    render(<PlayScreen problemId="p-001" />);

    // 로딩 완료 대기
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /문제 1 \//i })).toBeInTheDocument();
    });

    // 5개의 조각을 각각 선택하여 (2,0)부터 (2,4)까지 3행에 차례대로 배치
    // 조각함의 조각 카드를 찾아 클릭 -> 해당 보드 셀 클릭
    for (let col = 0; col < 5; col++) {
      const pieceBtn = await screen.findByRole("button", {
        name: new RegExp(`파란 직선 조각 ${col + 1}`, "i"),
      });
      await user.click(pieceBtn);

      // 보드의 3행 (col+1)열 빈칸 클릭
      const cell = screen.getByRole("gridcell", {
        name: new RegExp(`3행 ${col + 1}열`, "i"),
      });
      await user.click(cell);
    }

    // 모든 조각 배치 후 확인하기 버튼 활성화 확인
    const checkBtn = screen.getByRole("button", { name: "확인하기" });
    expect(checkBtn).not.toBeDisabled();

    // 확인하기 클릭
    await user.click(checkBtn);

    // 성공 모달이 표시되는지 확인
    await waitFor(() => {
      expect(screen.getByText("해냈어요!")).toBeInTheDocument();
    });

    // 성공 모달 안의 "다음 문제" 버튼 확인 (ActionBar와 Modal에 각각 존재)
    const nextBtns = screen.getAllByRole("button", { name: "다음 문제" });
    expect(nextBtns.length).toBeGreaterThanOrEqual(1);
    expect(nextBtns[0]).toBeInTheDocument();
  });
});
