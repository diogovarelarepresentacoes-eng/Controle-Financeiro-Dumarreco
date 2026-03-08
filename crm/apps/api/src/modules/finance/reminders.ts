import { ReceivableStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { writeAuditLog } from "../common/audit";

export type ReminderType = "D_MINUS_3" | "DUE_TODAY" | "D_PLUS_3";

export function classifyReminderType(dueDate: Date, now: Date): ReminderType | null {
  const due = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()));
  const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const diffDays = Math.round((due.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 3) return "D_MINUS_3";
  if (diffDays === 0) return "DUE_TODAY";
  if (diffDays === -3) return "D_PLUS_3";
  return null;
}

export async function runReceivableReminderJob(now = new Date()) {
  const receivables = await prisma.receivable.findMany({
    where: { status: { in: [ReceivableStatus.PENDENTE, ReceivableStatus.COBRANDO] } },
    include: { reminderLogs: true, conversation: { include: { contact: true } } }
  });

  const remindersSent: Array<{ receivableId: string; type: ReminderType }> = [];

  for (const receivable of receivables) {
    const reminderType = classifyReminderType(receivable.dueDate, now);
    if (!reminderType) continue;

    const alreadySent = receivable.reminderLogs.some((log) => log.reminderType === reminderType);
    if (alreadySent) continue;

    await prisma.chargeReminderLog.create({
      data: { receivableId: receivable.id, reminderType }
    });

    await prisma.message.create({
      data: {
        conversationId: receivable.conversationId,
        direction: "OUTBOUND",
        type: "TEXT",
        body: `Lembrete de cobranca (${reminderType}). Valor R$ ${Number(receivable.total).toFixed(2)}. Link: ${
          receivable.chargeLink ?? "sob consulta"
        }`
      }
    });

    await prisma.receivable.update({
      where: { id: receivable.id },
      data: { status: ReceivableStatus.COBRANDO }
    });

    await writeAuditLog({
      action: "RECEIVABLE_REMINDER_SENT",
      entity: "receivable",
      entityId: receivable.id,
      afterData: { reminderType }
    });
    remindersSent.push({ receivableId: receivable.id, type: reminderType });
  }

  return remindersSent;
}
