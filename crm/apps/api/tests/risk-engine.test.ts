import { RoleName } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { assessCommercialRisk } from "../src/modules/risk/engine";

describe("risk engine", () => {
  it("bloqueia desconto indevido com risco alto", () => {
    const result = assessCommercialRisk({
      role: RoleName.ATTENDANT,
      discountPct: 10,
      isNewCustomer: true,
      orderTotal: 7000,
      installmentsCount: 10,
      parcelingAllowed: false,
      promiseDeliveryWithoutStock: true,
      userMessage: "Se nao fechar vou no PROCON"
    });

    expect(result.level).toBe("ALTO");
    expect(result.blocked).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
