import { describe, expect, it } from "vitest";
import { requiresApprovalForAiSend } from "../src/modules/ai/approval";

describe("ai send approval", () => {
  it("nao permite envio IA sem aprovacao humana", () => {
    expect(requiresApprovalForAiSend("ai-1", undefined)).toBe(true);
    expect(requiresApprovalForAiSend("ai-1", "")).toBe(true);
  });

  it("permite envio IA com aprovacao humana", () => {
    expect(requiresApprovalForAiSend("ai-1", "user-1")).toBe(false);
  });
});
