"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const vitest_1 = require("vitest");
const { prismaMock } = vitest_1.vi.hoisted(() => ({
    prismaMock: {
        user: { findUnique: vitest_1.vi.fn() },
        product: { findUnique: vitest_1.vi.fn() },
        productPrice: { findUnique: vitest_1.vi.fn() },
        quote: { create: vitest_1.vi.fn() },
        auditLog: { create: vitest_1.vi.fn() }
    }
}));
vitest_1.vi.mock("../src/config/prisma", () => ({ prisma: prismaMock }));
const service_1 = require("../src/modules/quotes/service");
(0, vitest_1.describe)("create quote", () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        prismaMock.user.findUnique.mockResolvedValue({ id: "u-1", role: client_1.RoleName.ATTENDANT });
        prismaMock.product.findUnique.mockResolvedValue({ id: "p-1", name: "Cimento 50kg", unit: "UN" });
        prismaMock.productPrice.findUnique.mockResolvedValue({ price: "39.90" });
        prismaMock.quote.create.mockResolvedValue({ id: "q-1", items: [] });
        prismaMock.auditLog.create.mockResolvedValue({ id: "a-1" });
    });
    (0, vitest_1.it)("blocks discount above role limit", async () => {
        await (0, vitest_1.expect)((0, service_1.createQuote)({
            storeId: "s-1",
            contactId: "c-1",
            createdById: "u-1",
            items: [{ productId: "p-1", quantity: 2, discountPct: 5 }]
        })).rejects.toThrow("excede limite");
    });
});
