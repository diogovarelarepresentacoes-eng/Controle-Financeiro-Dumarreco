import { z } from "zod";

export const createQuoteSchema = z.object({
  storeId: z.string().min(1),
  contactId: z.string().min(1),
  opportunityId: z.string().optional(),
  worksiteId: z.string().optional(),
  createdById: z.string().min(1),
  installmentsCount: z.number().int().positive().default(1),
  parcelingAllowed: z.boolean().default(true),
  promiseDeliveryWithoutStock: z.boolean().default(false),
  userMessage: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().positive(),
        unitPrice: z.number().positive().optional(),
        discountPct: z.number().min(0).max(100).default(0)
      })
    )
    .min(1)
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
