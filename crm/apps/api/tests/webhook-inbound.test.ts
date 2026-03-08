import { describe, expect, it, vi, beforeEach } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    store: { findUnique: vi.fn() },
    contact: { upsert: vi.fn() },
    conversation: { findFirst: vi.fn(), create: vi.fn() },
    ticket: { create: vi.fn() },
    message: { create: vi.fn() },
    auditLog: { create: vi.fn() }
  }
}));

vi.mock("../src/config/prisma", () => ({ prisma: prismaMock }));
vi.mock("../src/modules/common/roundRobin", () => ({ assignRoundRobin: vi.fn(async () => "u-1") }));

import { ingestInboundMessage } from "../src/modules/whatsapp/service";

describe("webhook inbound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.store.findUnique.mockResolvedValue({ id: "s-1", code: "MATRIZ" });
    prismaMock.contact.upsert.mockResolvedValue({ id: "c-1" });
    prismaMock.conversation.findFirst.mockResolvedValue(null);
    prismaMock.conversation.create.mockResolvedValue({ id: "conv-1" });
    prismaMock.ticket.create.mockResolvedValue({ id: "t-1" });
    prismaMock.message.create.mockResolvedValue({ id: "m-1" });
    prismaMock.auditLog.create.mockResolvedValue({ id: "a-1" });
  });

  it("creates conversation and message from inbound payload", async () => {
    const result = await ingestInboundMessage({
      storeCode: "MATRIZ",
      from: "55999999999",
      type: "text",
      text: "Oi, preciso de cimento"
    });

    expect(prismaMock.conversation.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.message.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ conversationId: "conv-1", messageId: "m-1" });
  });
});
