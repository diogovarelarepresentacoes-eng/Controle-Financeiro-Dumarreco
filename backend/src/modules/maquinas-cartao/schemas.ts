import { z } from 'zod'

export const createMaquinaCartaoSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatorio'),
  adquirente: z.string().min(1, 'Adquirente obrigatorio'),
  descricao: z.string().optional(),
})

export const updateMaquinaCartaoSchema = createMaquinaCartaoSchema.partial()

export const listMaquinasCartaoQuerySchema = z.object({
  ativo: z.enum(['true', 'false']).optional(),
})

const createTaxaMaquinaSchemaBase = z.object({
  tipoCartao: z.enum(['debito', 'credito']),
  parcelas: z.number().int().min(1).max(12),
  taxaPercentual: z.number().min(0, 'Taxa nao pode ser negativa'),
})

export const createTaxaMaquinaSchema = createTaxaMaquinaSchemaBase.refine(
  (data) => {
    if (data.tipoCartao === 'debito') return data.parcelas === 1
    return true
  },
  { message: 'Debito deve ter sempre 1 parcela', path: ['parcelas'] }
)

export const updateTaxaMaquinaSchema = createTaxaMaquinaSchemaBase.partial()

export const modalidadeQuerySchema = z.object({
  tipoCartao: z.enum(['debito', 'credito']),
  quantidadeParcelas: z.coerce.number().int().min(1).max(12),
})
