import "fake-indexeddb/auto";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import devPackJson from "@/content/packs/engineering-demo.json";
import { validateContent } from "@/domain/content/validateContent";
import type { ResolvedPack } from "@/domain/types";
import { PlayScreen } from "@/features/play/PlayScreen";
import { useProgressSummary } from "@/features/progress/useProgressSummary";
import { MemoryProgressRepository } from "@/services/progress/MemoryProgressRepository";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

const validated = validateContent(devPackJson);
if (!validated.ok) throw new Error("pack invalid");
const pack: ResolvedPack = validated.pack;

function SummaryView({ repo }: { repo: MemoryProgressRepository }) {
  const summary = useProgressSummary(pack, repo);
  return (
    <div>
      <div data-testid="last-id">{summary.lastProblemId ?? "none"}</div>
      <div data-testid="status-p001">{summary.problemStatus["p-001"]}</div>
    </div>
  );
}

describe("진행 저장 및 이어하기 통합 테스트 (G11, T01, T02)", () => {
  let repo: MemoryProgressRepository;

  beforeEach(() => {
    repo = new MemoryProgressRepository();
  });

  it("G11: 문제를 열기만 하고 아무런 조작도 하지 않은 경우 저장되지 않아 이어하기 대상이 되지 않는다", async () => {
    render(<PlayScreen problemId="p-001" />);

    // 조각함 렌더링 대기
    const piece = await screen.findByRole("button", {
      name: /파란 직선 조각 1/i,
    });
    expect(piece).toBeInTheDocument();

    // 저장소 확인: 저장된 시도가 없어야 함
    const attempt = await repo.getAttempt(pack.packId, pack.contentVersion, "p-001");
    expect(attempt).toBeNull();

    // 요약 화면에서도 이어하기 대상 없음
    const { getByTestId } = render(<SummaryView repo={repo} />);
    await waitFor(() => {
      expect(getByTestId("last-id").textContent).toBe("none");
      expect(getByTestId("status-p001").textContent).toBe("not_started");
    });
  });

  it("T01, T02: 1조각을 배치하면 진행이 저장되어 이어하기 대상이 된다", async () => {
    const user = userEvent.setup();
    render(<PlayScreen problemId="p-001" />);

    // 조각 1 선택
    const piece = await screen.findByRole("button", {
      name: /파란 직선 조각 1/i,
    });
    await user.click(piece);

    // 3행 1열 셀 클릭하여 배치
    const cell = screen.getByRole("gridcell", {
      name: /3행 1열/i,
    });
    await user.click(cell);

    // 셀에 조각이 놓였는지 확인 (3행 1열 그리드 셀 라벨에 조각 이름 포함)
    await waitFor(() => {
      expect(screen.getByRole("gridcell", { name: /3행 1열, 파란 직선/i })).toBeInTheDocument();
    });
  });
});
