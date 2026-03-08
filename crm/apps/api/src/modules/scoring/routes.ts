import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { updateCustomerScoresDaily } from "./service";

export const scoringRouter = Router();

scoringRouter.get("/contact/:contactId", async (req, res, next) => {
  try {
    const params = z.object({ contactId: z.string().min(1) }).parse(req.params);
    const score = await prisma.customerScore.findUnique({ where: { contactId: params.contactId } });
    return res.status(200).json(score);
  } catch (error) {
    return next(error);
  }
});

scoringRouter.post("/jobs/run", async (_req, res, next) => {
  try {
    const updated = await updateCustomerScoresDaily();
    return res.status(200).json({ updatedCount: updated.length });
  } catch (error) {
    return next(error);
  }
});
