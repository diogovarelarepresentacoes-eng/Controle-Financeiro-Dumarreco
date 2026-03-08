import { beforeEach, describe, expect, it, vi } from "vitest";
import { classifyReminderType, runReceivableReminderJob } from "../src/modules/finance/reminders";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    receivable: { findMany: vi.fn(), update: vi.fn() },
    chargeReminderLog: { create: vi.fn() },
    message: { create: vi.fn() },
    auditLog: { create: vi.fn() }
  }
}));

vi.mock("../src/config/prisma", () => ({ prisma: prismaMock }));

describe("reminder job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("classifies reminder windows correctly", () => {
    const now = new Date("2026-02-17T00:00:00.000Z");
    expect(classifyReminderType(new Date("2026-02-20T00:00:00.000Z"), now)).toBe("D_MINUS_3");
    expect(classifyReminderType(new Date("2026-02-17T00:00:00.000Z"), now)).toBe("DUE_TODAY");
    expect(classifyReminderType(new Date("2026-02-14T00:00:00.000Z"), now)).toBe("D_PLUS_3");
  });

  it("selects only titles inside reminder windows", async () => {
    prismaMock.receivable.findMany.mockResolvedValue([
      {
        id: "r-1",
        total: "120.00",
        dueDate: new Date("2026-02-20T00:00:00.000Z"),
        chargeLink: "https://crm.local/cobranca/r-1",
        conversationId: "conv-1",
        reminderLogs: [],
        conversation: { contact: { name: "Cliente" } }
      },
      {
        id: "r-2",
        total: "90.00",
        dueDate: new Date("2026-02-25T00:00:00.000Z"),
        chargeLink: null,
        conversationId: "conv-2",
        reminderLogs: [],
        conversation: { contact: { name: "Cliente 2" } }
      }
    ]);
    prismaMock.chargeReminderLog.create.mockResolvedValue({ id: "log-1" });
    prismaMock.message.create.mockResolvedValue({ id: "m-1" });
    prismaMock.receivable.update.mockResolvedValue({ id: "r-1" });
    prismaMock.auditLog.create.mockResolvedValue({ id: "a-1" });

    const sent = await runReceivableReminderJob(new Date("2026-02-17T00:00:00.000Z"));
    expect(sent).toHaveLength(1);
    expect(sent[0].receivableId).toBe("r-1");
  });
});
