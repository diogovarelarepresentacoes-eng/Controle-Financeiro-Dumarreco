import { Router } from "express";
import { z } from "zod";
import { generateSalesCopilotSuggestion } from "./service";

export const copilotRouter = Router();

copilotRouter.post("/suggest", async (req, res, next) => {
  try {
    const body = z.object({ conversationId: z.string().min(1) }).parse(req.body);
    const suggestion = await generateSalesCopilotSuggestion(body.conversationId);
    return res.status(200).json(suggestion);
  } catch (error) {
    return next(error);
  }
});
