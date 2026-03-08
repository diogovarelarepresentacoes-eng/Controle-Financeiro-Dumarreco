import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { generateReceivableFromQuote } from "../finance/service";
import { writeAuditLog } from "./audit";

const moveSchema = z.object({
  opportunityId: z.string().min(1),
  toStageId: z.string().min(1),
  changedById: z.string().optional(),
  paymentMethod: z.string().optional()
});

export const kanbanRouter = Router();

kanbanRouter.get("/stages", async (_req, res, next) => {
  try {
    const stages = await prisma.pipelineStage.findMany({
      orderBy: { orderIndex: "asc" },
      include: { opportunities: { where: { isActive: true } } }
    });
    return res.status(200).json(stages);
  } catch (error) {
    return next(error);
  }
});

kanbanRouter.post("/move", async (req, res, next) => {
  try {
    const input = moveSchema.parse(req.body);
    const current = await prisma.opportunity.findUnique({ where: { id: input.opportunityId } });
    if (!current) return res.status(404).json({ message: "Oportunidade nao encontrada." });

    const updated = await prisma.opportunity.update({
      where: { id: input.opportunityId },
      data: { stageId: input.toStageId }
    });

    const stage = await prisma.pipelineStage.findUnique({ where: { id: input.toStageId } });
    if (stage?.isClosedWon) {
      const quote = await prisma.quote.findFirst({
        where: { opportunityId: updated.id, status: { in: ["APROVADO", "ENVIADO"] } },
        orderBy: { createdAt: "desc" }
      });

      if (quote) {
        const dueDate = new Date();
        dueDate.setUTCDate(dueDate.getUTCDate() + 7);
        await generateReceivableFromQuote({
          quoteId: quote.id,
          createdBy: input.changedById ?? "system",
          dueDate: dueDate.toISOString(),
          paymentMethod: input.paymentMethod ?? "LINK_PAGAMENTO",
          installments: []
        });
      }
    }

    await prisma.stageHistory.create({
      data: {
        opportunityId: updated.id,
        fromStageId: current.stageId,
        toStageId: input.toStageId,
        changedById: input.changedById ?? null
      }
    });

    await writeAuditLog({
      userId: input.changedById ?? null,
      action: "OPPORTUNITY_STAGE_CHANGED",
      entity: "opportunity",
      entityId: updated.id,
      beforeData: { stageId: current.stageId },
      afterData: { stageId: input.toStageId }
    });

    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
});
