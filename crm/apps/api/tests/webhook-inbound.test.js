"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const { prismaMock } = vitest_1.vi.hoisted(() => ({
    prismaMock: {
        store: { findUnique: vitest_1.vi.fn() },
        contact: { upsert: vitest_1.vi.fn() },
        conversation: { findFirst: vitest_1.vi.fn(), create: vitest_1.vi.fn() },
        ticket: { create: vitest_1.vi.fn() },
        message: { create: vitest_1.vi.fn() },
        auditLog: { create: vitest_1.vi.fn() }
    }
}));
vitest_1.vi.mock("../src/config/prisma", () => ({ prisma: prismaMock }));
vitest_1.vi.mock("../src/modules/common/roundRobin", () => ({ assignRoundRobin: vitest_1.vi.fn(async () => "u-1") }));
const service_1 = require("../src/modules/whatsapp/service");
(0, vitest_1.describe)("webhook inbound", () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        prismaMock.store.findUnique.mockResolvedValue({ id: "s-1", code: "MATRIZ" });
        prismaMock.contact.upsert.mockResolvedValue({ id: "c-1" });
        prismaMock.conversation.findFirst.mockResolvedValue(null);
        prismaMock.conversation.create.mockResolvedValue({ id: "conv-1" });
        prismaMock.ticket.create.mockResolvedValue({ id: "t-1" });
        prismaMock.message.create.mockResolvedValue({ id: "m-1" });
        prismaMock.auditLog.create.mockResolvedValue({ id: "a-1" });
    });
    (0, vitest_1.it)("creates conversation and message from inbound payload", async () => {
        const result = await (0, service_1.ingestInboundMessage)({
            storeCode: "MATRIZ",
            from: "55999999999",
            type: "text",
            text: "Oi, preciso de cimento"
        });
        (0, vitest_1.expect)(prismaMock.conversation.create).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(prismaMock.message.create).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(result).toEqual({ conversationId: "conv-1", messageId: "m-1" });
    });
});
