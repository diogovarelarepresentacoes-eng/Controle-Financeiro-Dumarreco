import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    receivable: { findUnique: vi.fn(), create: vi.fn() },
    quote: { findUnique: vi.fn() },
    $transaction: vi.fn(),
    auditLog: { create: vi.fn() }
  }
}));

vi.mock("../src/config/prisma", () => ({ prisma: prismaMock }));

import { generateReceivableFromQuote } from "../src/modules/finance/service";

describe("quote approval generates receivable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.receivable.findUnique.mockResolvedValue(null);
    prismaMock.quote.findUnique.mockResolvedValue({
      id: "q-1",
      total: "100.00",
      contactId: "c-1",
      opportunity: { conversationId: "conv-1" }
    });
    prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => {
      const tx = {
        receivable: {
          create: vi.fn().mockResolvedValue({
            id: "r-1",
            quoteId: "q-1",
            installments: [{ id: "i-1", number: 1 }]
          })
        },
        auditLog: { create: vi.fn().mockResolvedValue({ id: "a-1" }) }
      };
      return callback(tx);
    });
  });

  it("creates receivable from approved quote data", async () => {
    const dueDate = new Date().toISOString();
    const result = await generateReceivableFromQuote({
      quoteId: "q-1",
      createdBy: "u-1",
      dueDate,
      paymentMethod: "PIX",
      installments: []
    });

    expect(result.id).toBe("r-1");
    expect(prismaMock.quote.findUnique).toHaveBeenCalledTimes(1);
  });
});
