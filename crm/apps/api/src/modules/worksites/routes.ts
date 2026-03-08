import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";

const createSchema = z.object({
  contactId: z.string().min(1),
  name: z.string().min(2),
  address: z.string().optional(),
  type: z.enum(["Residencial", "Comercial", "Reforma"]).optional(),
  stage: z.string().optional(),
  recurringMaterials: z.array(z.string()).default([]),
  estimatedDurationDays: z.number().int().positive().optional(),
  notes: z.string().optional()
});

export const worksitesRouter = Router();

worksitesRouter.post("/", async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    const created = await prisma.worksite.create({
      data: {
        contactId: input.contactId,
        name: input.name,
        address: input.address ?? null,
        type: input.type ?? null,
        stage: input.stage ?? null,
        recurringMaterials: input.recurringMaterials,
        estimatedDurationDays: input.estimatedDurationDays ?? null,
        notes: input.notes ?? null
      }
    });
    return res.status(201).json(created);
  } catch (error) {
    return next(error);
  }
});
