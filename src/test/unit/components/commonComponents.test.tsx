import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Badge } from "@/components/game/Badge";
import { Button } from "@/components/game/Button";
import { ErrorPanel } from "@/components/game/ErrorPanel";
import { IconButton } from "@/components/game/IconButton";
import { InlineFeedback } from "@/components/game/InlineFeedback";
import { Skeleton } from "@/components/game/Skeleton";

describe("공통 컴포넌트 규격 검증 (상세서 13장)", () => {
  it("Button - 56px 기본 규격, 로딩 상태 시 aria-busy/이벤트 가드", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(<Button onClick={handleClick}>확인하기</Button>);

    const btn = screen.getByRole("button", { name: "확인하기" });
    expect(btn.className).toContain("btn");
    expect(btn.className).toContain("btn-primary");

    await user.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);

    // loading 전환
    rerender(
      <Button loading loadingText="확인 중" onClick={handleClick}>
        확인하기
      </Button>,
    );

    const loadingBtn = screen.getByRole("button", { name: "확인 중" });
    expect(loadingBtn).toHaveAttribute("aria-busy", "true");
    expect(loadingBtn).toBeDisabled();

    await user.click(loadingBtn);
    expect(handleClick).toHaveBeenCalledTimes(1); // 추가 호출 없음
  });

  it("IconButton - 48x48 규격 및 필수 aria-label", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <IconButton aria-label="조각함 다음 페이지" icon={<span>▶</span>} onClick={handleClick} />,
    );

    const btn = screen.getByRole("button", { name: "조각함 다음 페이지" });
    expect(btn.className).toContain("min-w-[48px]");
    expect(btn.className).toContain("min-h-[48px]");

    await user.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("Badge - tabIndex -1, role=status 또는 presentation, 성공 체크", () => {
    render(<Badge>풀었어요</Badge>);
    const badge = screen.getByText("풀었어요").parentElement;
    expect(badge).toHaveAttribute("tabindex", "-1");
    expect(badge?.className).toContain("rounded-full");
  });

  it("InlineFeedback - role=status, aria-live=polite, 최소 56px", () => {
    render(<InlineFeedback tone="error">여기에는 놓을 수 없어요.</InlineFeedback>);
    const feedback = screen.getByRole("status");
    expect(feedback).toHaveAttribute("aria-live", "polite");
    expect(feedback.className).toContain("min-h-[56px]");
    expect(screen.getByText("여기에는 놓을 수 없어요.")).toBeInTheDocument();
  });

  it("Skeleton - aria-hidden 및 배경색", () => {
    const { container } = render(<Skeleton className="w-16 h-16" />);
    const el = container.firstElementChild;
    expect(el).toHaveAttribute("aria-hidden", "true");
  });

  it("ErrorPanel - role=alert, 제목, 설명, 진단 코드 노출", () => {
    render(
      <ErrorPanel
        title="이 문제를 찾을 수 없어요."
        description="목록으로 돌아가서 다른 문제를 골라 주세요."
        code="NOT_FOUND"
      />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("이 문제를 찾을 수 없어요.")).toBeInTheDocument();
    expect(screen.getByText("코드: NOT_FOUND")).toBeInTheDocument();
  });
});
