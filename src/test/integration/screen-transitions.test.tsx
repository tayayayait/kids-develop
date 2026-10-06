import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PlayScreen } from "@/features/play/PlayScreen";
import { StartScreen } from "@/features/start/StartScreen";
import { ProblemList } from "@/routes/problems";
import { contentRepository } from "@/services/content/ContentRepository";
import * as browserSupportModule from "@/services/support/browserSupport";
import * as prepareProblemModule from "@/services/content/prepareProblem";

import type { ResolvedPack } from "@/domain/types";

// tanstack router useNavigate & Link 모킹
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@tanstack/react-router");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    Link: ({
      children,
      onClick,
      to,
      href,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to?: string }) => (
      <a
        href={to || href || "#"}
        onClick={(e) => {
          onClick?.(e);
        }}
        {...props}
      >
        {children}
      </a>
    ),
  };
});

describe("Phase 7: 화면 전이 및 안전성 통합 테스트", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.clear();
    }
  });

  describe("S01: 시작 화면 (StartScreen)", () => {
    it("정상 번들 팩 로드 시 제목, 진행 통계, 시작 버튼이 정상 표시된다 (T01)", async () => {
      render(<StartScreen />);

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "조각을 움직이며 문제를 풀어요" }),
        ).toBeInTheDocument();
        expect(screen.getByText(/풀어 본 문제/)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "문제 시작" })).toBeInTheDocument();
      });
    });

    it("문제가 없는 빈 팩일 경우 empty 상태와 '다시 확인' 버튼을 노출한다", async () => {
      vi.spyOn(contentRepository, "getPack").mockResolvedValueOnce({
        packId: "empty-pack",
        contentVersion: "1.0.0",
        schemaVersion: 1,
        title: "Empty Pack",
        problems: [],
        orderedProblems: [],
        problemById: {},
        typeById: {},
      } as unknown as ResolvedPack);

      render(<StartScreen />);

      await waitFor(() => {
        expect(screen.getByText("아직 준비된 문제가 없어요.")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "다시 확인" })).toBeInTheDocument();
      });
    });

    it("팩 로드 실패 시 error 상태 화면을 노출한다", async () => {
      vi.spyOn(contentRepository, "getPack").mockRejectedValueOnce(new Error("CONTENT_INVALID"));

      render(<StartScreen />);

      await waitFor(() => {
        expect(screen.getByText("문제를 준비하지 못했어요.")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
      });
    });
  });

  describe("S02: 문제 목록 화면 (ProblemList)", () => {
    it("문제 카드 15개와 상태 배지가 정상 렌더링된다", async () => {
      render(<ProblemList />);

      await waitFor(() => {
        expect(screen.getByText("문제 1")).toBeInTheDocument();
        expect(screen.getByText("문제 15")).toBeInTheDocument();
      });
    });

    it("스크롤 복원 정보가 sessionStorage에 있을 때 복원을 수행하고 키를 삭제한다", async () => {
      window.sessionStorage.setItem("cb:list-scroll", "350");
      const scrollSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

      render(<ProblemList />);

      await waitFor(() => {
        expect(screen.getByText("문제 1")).toBeInTheDocument();
      });

      expect(scrollSpy).toHaveBeenCalledWith({ top: 350, behavior: "instant" });
      expect(window.sessionStorage.getItem("cb:list-scroll")).toBeNull();
    });
  });

  describe("S03: 플레이 화면 예외 처리 및 브라우저 지원 (PlayScreen)", () => {
    it("존재하지 않는 problemId 접근 시 E01 안내 및 문제 목록 링크를 제공한다", async () => {
      render(<PlayScreen problemId="non-existent-problem" />);

      await waitFor(() => {
        expect(screen.getByText("이 문제를 찾을 수 없어요.")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "문제 목록" })).toBeInTheDocument();
      });
    });

    it("브라우저 필수 기능(PointerEvent 등) 미지원 환경에서 지원 불가 에러 화면을 노출한다 (7-4)", async () => {
      vi.spyOn(browserSupportModule, "checkBrowserSupport").mockReturnValue({
        supported: false,
        unsupportedFeatures: ["PointerEvent"],
      });

      render(<PlayScreen problemId="p-001" />);

      await waitFor(() => {
        expect(screen.getByText("이 브라우저에서는 조각을 움직일 수 없어요.")).toBeInTheDocument();
        expect(screen.getByText("다른 브라우저로 열어 주세요.")).toBeInTheDocument();
      });
    });

    it("빈 보드에서는 '확인하기' 버튼이 비활성화되어 있다 (T19)", async () => {
      render(<PlayScreen problemId="p-001" />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /문제 1 \//i })).toBeInTheDocument();
      });

      const checkBtn = screen.getByRole("button", { name: "확인하기" });
      expect(checkBtn).toBeDisabled();
    });

    it("다음 문제 준비 실패 시 현재 보드를 유지하고 NEXT_LOAD_FAILED 피드백을 노출한다 (T24)", async () => {
      const user = userEvent.setup();
      render(<PlayScreen problemId="p-001" />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /문제 1 \//i })).toBeInTheDocument();
      });

      // 5개 조각 배치하여 성공 상태 도달
      for (let col = 0; col < 5; col++) {
        const pieceBtn = await screen.findByRole("button", {
          name: new RegExp(`파란 직선 조각 ${col + 1}`, "i"),
        });
        await user.click(pieceBtn);
        const cell = screen.getByRole("gridcell", {
          name: new RegExp(`3행 ${col + 1}열`, "i"),
        });
        await user.click(cell);
      }

      const checkBtn = screen.getByRole("button", { name: "확인하기" });
      await user.click(checkBtn);

      await waitFor(() => {
        expect(screen.getByText("해냈어요!")).toBeInTheDocument();
      });

      // prepareProblem이 실패하도록 모킹 (T24 네트워크/준비 실패 재현)
      vi.spyOn(prepareProblemModule, "prepareProblem").mockRejectedValueOnce(
        new Error("NETWORK_OR_PREPARE_FAILURE"),
      );

      // 성공 모달의 '다음 문제' 버튼 클릭
      const dialog = screen.getByRole("dialog");
      const nextBtnInModal = within(dialog).getByRole("button", { name: "다음 문제" });
      await user.click(nextBtnInModal);

      // 모달은 닫히고, 실패 피드백 안내가 노출되며 현재 보드 상태를 유지함
      await waitFor(() => {
        expect(
          screen.getByText("다음 문제를 가져오지 못했어요. 다시 눌러 주세요."),
        ).toBeInTheDocument();
      });

      // 하단 액션 바의 '다음 문제' 버튼이 다시 활성화되어 재시도 가능한지 확인
      const nextBtnInActionBar = screen.getByRole("button", { name: "다음 문제" });
      expect(nextBtnInActionBar).not.toBeDisabled();
    });
  });
});
