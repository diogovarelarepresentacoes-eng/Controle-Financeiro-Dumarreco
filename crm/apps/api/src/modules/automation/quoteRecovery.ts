import { FollowupTaskStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";

export async function runQuoteRecoveryJob(now = new Date()) {
  const sentQuotes = await prisma.quote.findMany({
    where: { status: "ENVIADO" },
    include: { followupTasks: true }
  });

  const createdTasks: string[] = [];
  for (const quote of sentQuotes) {
    const hours = (now.getTime() - quote.createdAt.getTime()) / (1000 * 60 * 60);
    if (hours >= 24 && !quote.followupTasks.some((task) => task.suggestedMessage)) {
      await prisma.quoteFollowupTask.create({
        data: {
          quoteId: quote.id,
          status: FollowupTaskStatus.PENDING,
          suggestedMessage: "Olá! Conseguiu avaliar o orçamento? Posso te ajudar a fechar hoje.",
          dueAt: new Date(now.getTime() + 1000 * 60 * 15)
        }
      });
      createdTasks.push(quote.id);
    }
    if (hours >= 72 && !quote.followupTasks.some((task) => !task.suggestedMessage)) {
      await prisma.quoteFollowupTask.create({
        data: {
          quoteId: quote.id,
          status: FollowupTaskStatus.PENDING,
          suggestedMessage: null,
          dueAt: now
        }
      });
      createdTasks.push(quote.id);
    }
  }

  return createdTasks;
}
