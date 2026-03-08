"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const policyEngine_1 = require("../src/modules/ai/policyEngine");
(0, vitest_1.describe)("policy engine", () => {
    (0, vitest_1.it)("requires human review for price/stock/prazo themes", () => {
        const decision = (0, policyEngine_1.evaluatePolicy)({
            mode: "ASSISTIDO",
            userMessage: "Qual o preco final e prazo de entrega?",
            confidence: 0.95,
            hasSource: true
        });
        (0, vitest_1.expect)(decision.requiresHuman).toBe(true);
    });
    (0, vitest_1.it)("allows auto only for safe faq with high confidence and source", () => {
        const decision = (0, policyEngine_1.evaluatePolicy)({
            mode: "AUTO",
            userMessage: "Qual o horario da loja?",
            confidence: 0.91,
            hasSource: true
        });
        (0, vitest_1.expect)(decision.allowAutoSend).toBe(true);
    });
});
