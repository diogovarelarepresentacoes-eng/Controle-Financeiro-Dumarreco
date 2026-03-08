import { describe, expect, it } from "vitest";
import { evaluatePolicy } from "../src/modules/ai/policyEngine";

describe("policy engine", () => {
  it("requires human review for price/stock/prazo themes", () => {
    const decision = evaluatePolicy({
      mode: "ASSISTIDO",
      userMessage: "Qual o preco final e prazo de entrega?",
      confidence: 0.95,
      hasSource: true
    });

    expect(decision.requiresHuman).toBe(true);
  });

  it("blocks parcelamento and discount negotiation", () => {
    const decision = evaluatePolicy({
      mode: "AUTO",
      userMessage: "Faz por 10x com desconto e sem juros?",
      confidence: 0.95,
      hasSource: true
    });

    expect(decision.requiresHuman).toBe(true);
    expect(decision.allowAutoSend).toBe(false);
  });

  it("allows auto only for safe faq with high confidence and source", () => {
    const decision = evaluatePolicy({
      mode: "AUTO",
      userMessage: "Qual o horario da loja?",
      confidence: 0.91,
      hasSource: true
    });

    expect(decision.allowAutoSend).toBe(true);
  });
});
