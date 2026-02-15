import { z } from 'zod'

export const createPurchaseManualSchema = z.object({
  supplierName: z.string().min(1),
  supplierCnpj: z.string().min(11).optional(),
  issueDate: z.string().min(10),
  description: z.string().optional(),
  notes: z.string().optional(),
  totalAmount: z.number().nonnegative(),
  category: z.string().optional(),
  costCenter: z.string().optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1),
        ncm: z.string().optional(),
        quantity: z.number().positive(),
        unitAmount: z.number().nonnegative(),
        totalAmount: z.number().nonnegative(),
      }),
    )
    .optional(),
})

export const generatePayablesSchema = z.object({
  totalAmount: z.number().positive(),
  installments: z.number().int().min(1).max(120),
  firstDueDate: z.string().min(10),
  descriptionBase: z.string().optional(),
})

export const listPurchasesQuerySchema = z.object({
  competenceMonth: z.string().optional(),
  supplier: z.string().optional(),
  withInvoice: z.enum(['all', 'yes', 'no']).optional(),
  paymentStatus: z.enum(['all', 'without_payables', 'pending', 'paid']).optional(),
})
