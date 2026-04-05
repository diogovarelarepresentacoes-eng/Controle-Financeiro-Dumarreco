import { z } from 'zod'

const taxaCartaoBase = z.object({
  descricao: z.string().min(1, 'Descricao obrigatoria'),
  tipoCartao: z.enum(['debito', 'credito']),
  quantidadeParcelas: z.number().int().min(1).max(12),
  taxaPercentual: z.number().min(0, 'Taxa nao pode ser negativa'),
})

export const createTaxaCartaoSchema = taxaCartaoBase.refine(
  (data) => {
    if (data.tipoCartao === 'debito') return data.quantidadeParcelas === 1
    return true
  },
  { message: 'Debito deve ter sempre 1 parcela', path: ['quantidadeParcelas'] }
)

export const updateTaxaCartaoSchema = taxaCartaoBase.partial()

export const listTaxasCartaoQuerySchema = z.object({
  tipo: z.enum(['debito', 'credito', 'todas']).optional().default('todas'),
  ativo: z.enum(['true', 'false']).optional(),
})
