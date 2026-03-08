import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { generateReceivableFromQuote } from "../finance/service";
import { createQuoteSchema } from "./schemas";
import { createQuote } from "./service";

export const quotesRouter = Router();

quotesRouter.post("/", async (req, res, next) => {
  try {
    const input = createQuoteSchema.parse(req.body);
    const quote = await createQuote(input);
    return res.status(201).json(quote);
  } catch (error) {
    return next(error);
  }
});

quotesRouter.post("/:id/approve-whatsapp", async (req, res, next) => {
  try {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const payload = z
      .object({
        createdBy: z.string().min(1),
        dueDate: z.string().datetime(),
        paymentMethod: z.string().min(1),
        installments: z
          .array(
            z.object({
              number: z.number().int().positive(),
              amount: z.number().positive(),
              dueDate: z.string().datetime()
            })
          )
          .default([])
      })
      .parse(req.body);

    const quote = await prisma.quote.update({
      where: { id: params.id },
      data: { approvedAtWhatsApp: true, status: "APROVADO" }
    });

    const receivable = await generateReceivableFromQuote({
      quoteId: quote.id,
      createdBy: payload.createdBy,
      dueDate: payload.dueDate,
      paymentMethod: payload.paymentMethod,
      installments: payload.installments
    });

    return res.status(200).json({ quote, receivable });
  } catch (error) {
    return next(error);
  }
});
