import { z } from 'zod'

export const createVendaSchema = z.object({
  id: z.string().uuid().optional(),
  descricao: z.string().min(1, 'Descricao obrigatoria'),
  valor: z.coerce.number(),
  formaPagamento: z.string().min(1),
  contaBancoId: z.string().nullish(),
  data: z.string().min(1),
  maquinaCartaoId: z.string().nullish(),
  maquinaCartaoNome: z.string().nullish(),
  tipoPagamentoCartao: z.string().nullish(),
  quantidadeParcelas: z.coerce.number().int().nullish(),
  valorBruto: z.coerce.number().nullish(),
  taxaPercentualCartao: z.coerce.number().nullish(),
  valorTaxaCartao: z.coerce.number().nullish(),
  valorLiquido: z.coerce.number().nullish(),
  observacaoFinanceira: z.string().nullish(),
})

export const updateVendaSchema = createVendaSchema.partial()
