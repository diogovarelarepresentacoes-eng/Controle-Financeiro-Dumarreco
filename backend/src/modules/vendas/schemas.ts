import { z } from 'zod'

export const createVendaSchema = z.object({
  id: z.string().uuid().optional(),
  descricao: z.string().min(1, 'Descricao obrigatoria'),
  valor: z.number(),
  formaPagamento: z.string().min(1),
  contaBancoId: z.string().nullish(),
  data: z.string().min(1),
  maquinaCartaoId: z.string().nullish(),
  maquinaCartaoNome: z.string().nullish(),
  tipoPagamentoCartao: z.string().nullish(),
  quantidadeParcelas: z.number().int().nullish(),
  valorBruto: z.number().nullish(),
  taxaPercentualCartao: z.number().nullish(),
  valorTaxaCartao: z.number().nullish(),
  valorLiquido: z.number().nullish(),
  observacaoFinanceira: z.string().nullish(),
})

export const updateVendaSchema = createVendaSchema.partial()
