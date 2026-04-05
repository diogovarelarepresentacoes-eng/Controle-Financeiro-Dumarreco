import { z } from 'zod'

export const createContaBancoSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatorio'),
  banco: z.string().min(1, 'Banco obrigatorio'),
  agencia: z.string().min(1, 'Agencia obrigatoria'),
  conta: z.string().min(1, 'Conta obrigatoria'),
  saldoInicial: z.number(),
  saldoAtual: z.number(),
  formasAceitas: z.array(z.string()).default([]),
  ativo: z.boolean().default(true),
})

export const updateContaBancoSchema = createContaBancoSchema.partial()
