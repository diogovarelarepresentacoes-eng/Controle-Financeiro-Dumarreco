import { z } from 'zod'

export const listProductsQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
})

export const createProductSchema = z.object({
  code: z.string().min(1),
  description: z.string().min(1),
  priceInstallment: z.number().min(0),
  stockBalance: z.number().min(0),
  unit: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const updateProductSchema = createProductSchema

export const activateProductSchema = z.object({
  isActive: z.boolean(),
})

export const importProductsOptionsSchema = z.object({
  mode: z.enum(['INSERT_ONLY', 'UPSERT_ALL']),
  createdBy: z.string().optional(),
  mapping: z
    .object({
      code: z.string().min(1),
      description: z.string().optional(),
      priceInstallment: z.string().optional(),
      stockBalance: z.string().optional(),
    })
    .optional(),
})

export const importStockOptionsSchema = z.object({
  create_if_missing: z.boolean().default(true),
  update_mode: z.enum(['SET', 'ADD']),
  createdBy: z.string().optional(),
  mapping: z.object({
    code: z.string().min(1),
    stockBalance: z.string().min(1),
    description: z.string().optional(),
    priceInstallment: z.string().optional(),
  }),
})
