import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { evaluatePolicy } from "./policyEngine";
import { buildStockContext } from "./stockContext";

const suggestSchema = z.object({
  conversationId: z.string().min(1),
  userMessage: z.string().min(1),
  mode: z.enum(["MANUAL", "ASSISTIDO", "AUTO"]),
  confidence: z.number().min(0).max(1),
  draft: z.string().min(1),
  sources: z.array(z.string()).default([]),
  inputContextIds: z.array(z.string()).default([])
});

export const aiRouter = Router();

aiRouter.post("/suggestions", async (req, res, next) => {
  try {
    const data = suggestSchema.parse(req.body);
    const stockContext = await buildStockContext(data.userMessage);
    const mergedSources = [...data.sources, ...stockContext.sourceLines];

    const decision = evaluatePolicy({
      mode: data.mode,
      userMessage: data.userMessage,
      confidence: data.confidence,
      hasSource: mergedSources.length > 0,
      stockIntent: stockContext.stockIntent,
      stockChecked: stockContext.consulted,
      stockFound: stockContext.found
    });
    const safeDraft = !stockContext.stockIntent
      ? mergedSources.length > 0
        ? data.draft
        : "Preciso confirmar essa informacao com um atendente."
      : stockContext.found
        ? `${data.draft}\n\nConsulta de estoque confirmada no sistema interno.`
        : "Nao encontrei esse item no sistema. Pode confirmar o codigo ou a descricao?";

    const saved = await prisma.aiSuggestion.create({
      data: {
        conversationId: data.conversationId,
        inputContextIds: data.inputContextIds,
        responseDraft: safeDraft,
        confidence: data.confidence.toFixed(2),
        sources: mergedSources,
        requiresHuman: decision.requiresHuman
      }
    });

    return res.status(201).json({ ...saved, policy: decision });
  } catch (error) {
    return next(error);
  }
});
