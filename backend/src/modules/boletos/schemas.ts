import { z } from 'zod'

export const createBoletoSchema = z.object({
  id: z.string().uuid().optional(),
  descricao: z.string().min(1, 'Descricao obrigatoria'),
  valor: z.number().positive('Valor deve ser positivo'),
  vencimento: z.string().min(1),
  pago: z.boolean().default(false),
  dataPagamento: z.string().nullish(),
  origemPagamento: z.string().nullish(),
  contaBancoId: z.string().nullish(),
  compraId: z.string().nullish(),
})

export const updateBoletoSchema = createBoletoSchema.partial()

export const baixaBoletoSchema = z.object({
  origem: z.enum(['dinheiro', 'conta_banco']),
  contaBancoId: z.string().optional(),
})
