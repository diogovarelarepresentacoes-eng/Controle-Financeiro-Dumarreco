import { describe, expect, it, vi } from "vitest";

import { buildStockContext } from "../src/modules/ai/stockContext";

describe("ai stock context", () => {
  it("consulta estoque via service antes de responder", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            code: "CIM-001",
            description: "Cimento",
            stockBalance: 10,
            priceInstallment: 39.9,
            isActive: true
          }
        ]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const context = await buildStockContext("Tem estoque do CIM-001?");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(context.stockIntent).toBe(true);
    expect(context.consulted).toBe(true);
    expect(context.found).toBe(true);
    vi.unstubAllGlobals();
  });
});
