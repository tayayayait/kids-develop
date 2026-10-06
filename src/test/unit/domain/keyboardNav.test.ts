import { describe, expect, it } from "vitest";
import { nextFocus } from "@/domain/layout/keyboardNav";

describe("nextFocus (15.2 키보드 격자 탐색)", () => {
  it("Arrow 방향키로 상하좌우 1칸씩 이동한다", () => {
    expect(nextFocus({ row: 2, col: 2 }, "ArrowUp")).toEqual({ row: 1, col: 2 });
    expect(nextFocus({ row: 2, col: 2 }, "ArrowDown")).toEqual({ row: 3, col: 2 });
    expect(nextFocus({ row: 2, col: 2 }, "ArrowLeft")).toEqual({ row: 2, col: 1 });
    expect(nextFocus({ row: 2, col: 2 }, "ArrowRight")).toEqual({ row: 2, col: 3 });
  });

  it("격자 경계(0..4)를 벗어나지 않고 유지된다", () => {
    expect(nextFocus({ row: 0, col: 0 }, "ArrowUp")).toEqual({ row: 0, col: 0 });
    expect(nextFocus({ row: 0, col: 0 }, "ArrowLeft")).toEqual({ row: 0, col: 0 });
    expect(nextFocus({ row: 4, col: 4 }, "ArrowDown")).toEqual({ row: 4, col: 4 });
    expect(nextFocus({ row: 4, col: 4 }, "ArrowRight")).toEqual({ row: 4, col: 4 });
  });

  it("Home과 End는 현재 행의 첫 열(0)과 마지막 열(4)로 이동한다", () => {
    expect(nextFocus({ row: 2, col: 2 }, "Home")).toEqual({ row: 2, col: 0 });
    expect(nextFocus({ row: 2, col: 2 }, "End")).toEqual({ row: 2, col: 4 });
  });

  it("Ctrl + Home과 Ctrl + End는 (0,0)과 (4,4)로 이동한다", () => {
    expect(nextFocus({ row: 2, col: 2 }, "Home", true)).toEqual({ row: 0, col: 0 });
    expect(nextFocus({ row: 2, col: 2 }, "End", true)).toEqual({ row: 4, col: 4 });
  });

  it("그 외 키는 위치를 변경하지 않는다", () => {
    expect(nextFocus({ row: 2, col: 2 }, "Tab")).toEqual({ row: 2, col: 2 });
    expect(nextFocus({ row: 2, col: 2 }, "Enter")).toEqual({ row: 2, col: 2 });
  });
});
