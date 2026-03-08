import { RoleName } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findUnique: vi.fn() },
    product: { findUnique: vi.fn() },
    productPrice: { findUnique: vi.fn() },
    priceRule: { findFirst: vi.fn() },
    quote: { create: vi.fn() },
    auditLog: { create: vi.fn() }
  }
}));

vi.mock("../src/config/prisma", () => ({ prisma: prismaMock }));

import { createQuote } from "../src/modules/quotes/service";

describe("create quote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue({ id: "u-1", role: RoleName.ATTENDANT });
    prismaMock.product.findUnique.mockResolvedValue({ id: "p-1", name: "Cimento 50kg", unit: "SACO" });
    prismaMock.productPrice.findUnique.mockResolvedValue({ price: "39.90" });
    prismaMock.priceRule.findFirst.mockResolvedValue(null);
    prismaMock.quote.create.mockResolvedValue({ id: "q-1", items: [] });
    prismaMock.auditLog.create.mockResolvedValue({ id: "a-1" });
  });

  it("blocks discount above role limit", async () => {
    await expect(
      createQuote({
        storeId: "s-1",
        contactId: "c-1",
        createdById: "u-1",
        items: [{ productId: "p-1", quantity: 2, discountPct: 5 }]
      })
    ).rejects.toThrow("excede limite");
  });
});
