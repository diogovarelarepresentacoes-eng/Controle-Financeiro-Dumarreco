import { Router } from "express";
import { z } from "zod";
import { generateReceivableSchema, registerPaymentSchema } from "./schemas";
import {
  generateReceivableFromQuote,
  loadFinancePanelByConversation,
  registerPayment
} from "./service";
import { runReceivableReminderJob } from "./reminders";

export const financeRouter = Router();

financeRouter.post("/receivables/from-quote", async (req, res, next) => {
  try {
    const input = generateReceivableSchema.parse(req.body);
    const receivable = await generateReceivableFromQuote(input);
    return res.status(201).json(receivable);
  } catch (error) {
    return next(error);
  }
});

financeRouter.post("/payments", async (req, res, next) => {
  try {
    const input = registerPaymentSchema.parse(req.body);
    const payment = await registerPayment(input);
    return res.status(201).json(payment);
  } catch (error) {
    return next(error);
  }
});

financeRouter.get("/conversation/:conversationId", async (req, res, next) => {
  try {
    const params = z.object({ conversationId: z.string().min(1) }).parse(req.params);
    const panel = await loadFinancePanelByConversation(params.conversationId);
    return res.status(200).json(panel);
  } catch (error) {
    return next(error);
  }
});

financeRouter.post("/jobs/reminders/run", async (_req, res, next) => {
  try {
    const sent = await runReceivableReminderJob();
    return res.status(200).json({ sent });
  } catch (error) {
    return next(error);
  }
});
