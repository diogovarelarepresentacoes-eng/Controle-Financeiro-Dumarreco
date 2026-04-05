import { z } from 'zod'

export const createDespesaSchema = z.object({
  id: z.string().uuid().optional(),
  descricao: z.string().min(1, 'Descricao obrigatoria'),
  categoria: z.string().min(1),
  tipo: z.string().min(1),
  valor: z.number().positive(),
  dataVencimento: z.string().min(1),
  dataPagamento: z.string().nullish(),
  status: z.string().default('pendente'),
  formaPagamento: z.string().min(1),
  origemPagamento: z.string().nullish(),
  contaBancoId: z.string().nullish(),
  fornecedor: z.string().default(''),
  centroCusto: z.string().default(''),
  observacoes: z.string().default(''),
  recorrente: z.boolean().default(false),
  periodicidade: z.string().nullish(),
  recorrenciaOrigemId: z.string().nullish(),
})

export const updateDespesaSchema = createDespesaSchema.partial()

export const pagamentoDespesaSchema = z.object({
  origemPagamento: z.enum(['dinheiro', 'conta_banco']),
  contaBancoId: z.string().optional(),
  dataPagamento: z.string().optional(),
})

export const deletedRecurrenceMarkerSchema = z.object({
  origemId: z.string().min(1),
  dataVencimento: z.string().min(1),
})
