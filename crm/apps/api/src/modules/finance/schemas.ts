import { ReceivableStatus } from "@prisma/client";
import { z } from "zod";

export const generateReceivableSchema = z.object({
  quoteId: z.string().min(1),
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
});

export const registerPaymentSchema = z.object({
  receivableId: z.string().min(1),
  amount: z.number().positive(),
  paidAt: z.string().datetime(),
  method: z.string().min(1),
  reference: z.string().optional(),
  authorizedByUserId: z.string().min(1)
});

export const updateReceivableStatusSchema = z.object({
  status: z.nativeEnum(ReceivableStatus)
});

export type GenerateReceivableInput = z.infer<typeof generateReceivableSchema>;
export type RegisterPaymentInput = z.infer<typeof registerPaymentSchema>;
