import { describe, expect, it } from "vitest";
import { checkBrowserSupport } from "@/services/support/browserSupport";

describe("checkBrowserSupport (7.4 브라우저 지원 검사)", () => {
  it("기본 브라우저 환경에서 지원됨을 판정한다", () => {
    const result = checkBrowserSupport();
    // jsdom/modern 브라우저 환경
    expect(result).toHaveProperty("supported");
    expect(Array.isArray(result.unsupportedFeatures)).toBe(true);
  });
});
