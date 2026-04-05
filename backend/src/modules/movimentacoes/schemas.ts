import { z } from 'zod'

export const createMovimentacaoSchema = z.object({
  id: z.string().uuid().optional(),
  contaBancoId: z.string().min(1),
  tipo: z.enum(['entrada', 'saida']),
  valor: z.number().positive(),
  descricao: z.string().min(1),
  boletoId: z.string().nullish(),
  vendaId: z.string().nullish(),
  despesaId: z.string().nullish(),
  data: z.string().min(1),
})
